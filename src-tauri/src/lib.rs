use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{
    menu::{MenuBuilder, SubmenuBuilder},
    Emitter,
};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiActionPlanDraftAction {
    recommendation_id: String,
    title: String,
    note: String,
    priority: String,
    timeframe: String,
    confidence: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiActionPlanDraft {
    summary: String,
    actions: Vec<AiActionPlanDraftAction>,
}

fn action_plan_schema() -> Value {
    json!({
      "type": "object",
      "additionalProperties": false,
      "required": ["summary", "actions"],
      "properties": {
        "summary": {
          "type": "string",
          "description": "One concise executive sentence summarizing the action plan."
        },
        "actions": {
          "type": "array",
          "description": "Polished versions of the Vyntax base recommendations. Include only recommendation IDs from the input.",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "recommendationId",
              "title",
              "note",
              "priority",
              "timeframe",
              "confidence"
            ],
            "properties": {
              "recommendationId": {
                "type": "string",
                "description": "The matching Vyntax base recommendation ID."
              },
              "title": {
                "type": "string",
                "description": "A concise operator-facing recovery action title."
              },
              "note": {
                "type": "string",
                "description": "A short, practical note explaining why this action matters and what to do next."
              },
              "priority": {
                "type": "string",
                "enum": ["High", "Medium", "Low"]
              },
              "timeframe": {
                "type": "string",
                "enum": ["Today", "This Week", "Month-End"]
              },
              "confidence": {
                "type": "string",
                "enum": ["High", "Medium", "Low"]
              }
            }
          }
        }
      }
    })
}

fn extract_openai_text(response: &Value) -> Option<String> {
    if let Some(output_text) = response.get("output_text").and_then(Value::as_str) {
        return Some(output_text.to_string());
    }

    let outputs = response.get("output").and_then(Value::as_array)?;
    for output in outputs {
        let Some(content_items) = output.get("content").and_then(Value::as_array) else {
            continue;
        };
        for content in content_items {
            if let Some(text) = content.get("text").and_then(Value::as_str) {
                return Some(text.to_string());
            }
        }
    }

    None
}

fn extract_openai_error(body: &str) -> String {
    serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|value| {
            value
                .get("error")
                .and_then(|error| error.get("message"))
                .and_then(Value::as_str)
                .map(ToString::to_string)
        })
        .unwrap_or_else(|| body.chars().take(240).collect())
}

#[tauri::command]
async fn generate_ai_action_plan(
    api_key: String,
    model: String,
    payload: Value,
) -> Result<AiActionPlanDraft, String> {
    let api_key = api_key.trim();
    if api_key.is_empty() {
        return Err("Plan Assist access is required.".to_string());
    }

    let payload_text = serde_json::to_string_pretty(&payload)
        .map_err(|error| format!("Could not prepare AI payload: {error}"))?;
    let instructions = "You are Vyntax's hotel GOP analyst and action-plan assistant. \
Use the provided Vyntax facts and base recommendations only. \
Do not invent dollar impacts, departments, property facts, forecasts, or guarantees. \
Polish the action titles and notes so a hotel operator or AGM can quickly understand what to do, who should own it, why it matters, and how to verify it. \
Avoid generic cost cutting; connect every recommendation to the provided variance, flow-through, or department fact. \
Keep the language calm, practical, executive, and concise.";
    let request_body = json!({
      "model": model,
      "instructions": instructions,
      "input": [
        {
          "role": "user",
          "content": [
            {
              "type": "input_text",
              "text": payload_text
            }
          ]
        }
      ],
      "reasoning": {
        "effort": "low"
      },
      "text": {
        "format": {
          "type": "json_schema",
          "name": "vyntax_action_plan",
          "strict": true,
          "schema": action_plan_schema()
        }
      }
    });
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/responses")
        .header(AUTHORIZATION, format!("Bearer {api_key}"))
        .header(CONTENT_TYPE, "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|error| format!("Plan Assist request failed: {error}"))?;
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Plan Assist response could not be read: {error}"))?;

    if !status.is_success() {
        return Err(format!(
            "Plan Assist request failed ({status}): {}",
            extract_openai_error(&body)
        ));
    }

    let response_json = serde_json::from_str::<Value>(&body)
        .map_err(|error| format!("Plan Assist response was not valid JSON: {error}"))?;
    let output_text = extract_openai_text(&response_json)
        .ok_or_else(|| "Plan Assist response did not include action-plan text.".to_string())?;

    serde_json::from_str::<AiActionPlanDraft>(&output_text)
        .map_err(|error| format!("Plan Assist response did not match the expected format: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let file_menu = SubmenuBuilder::new(app, "File")
                .text("save-snapshot", "Save Snapshot")
                .text("export-csv", "Export CSV")
                .text("print", "Print / Export PDF")
                .text("quit", "Quit")
                .build()?;

            let help_menu = SubmenuBuilder::new(app, "Help")
                .text("about", "About Vyntax")
                .build()?;

            let menu = MenuBuilder::new(app)
                .items(&[&file_menu, &help_menu])
                .build()?;
            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle: &tauri::AppHandle, event| {
                match event.id().0.as_str() {
                    "save-snapshot" | "export-csv" | "print" | "about" => {
                        let action = event.id().0.to_string();
                        if let Err(error) = app_handle.emit("vyntax-menu", action) {
                            eprintln!("failed to emit menu action: {error}");
                        }
                    }
                    "quit" => {
                        app_handle.exit(0);
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![generate_ai_action_plan])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
