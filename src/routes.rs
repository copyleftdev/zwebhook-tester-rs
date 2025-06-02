use std::net::SocketAddr;
use std::sync::Arc;
use axum::{
    body::Bytes,
    extract::{ConnectInfo, State},
    http::{HeaderMap, Method, StatusCode, Uri},
    response::IntoResponse,
};
use chrono::Utc;
use serde_json::{json, Value};
use tracing::{info, warn};

use crate::storage::ArrowStorage;
use crate::websocket::WebSocketHandler;

// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub storage: Arc<ArrowStorage>,
    pub ws_handler: Arc<WebSocketHandler>,
}

// Handle any webhook request
pub async fn handle_webhook(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    method: Method,
    uri: Uri,
    headers: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    let client_ip = addr.ip().to_string();
    let path = uri.path().to_string();
    let timestamp = Utc::now();
    
    // Original port cannot be reliably determined from the socket info in this context
    // In a real implementation, this would come from the SO_ORIGINAL_DST socket option
    // For this example, we'll use a placeholder
    let original_port = 8080; // Placeholder - in production this would use SO_ORIGINAL_DST
    
    // Defensive payload parsing - gracefully handle malformed payloads
    let payload = parse_payload(&body);
    
    // Convert headers to a JSON object
    let headers_json = headers_to_json(&headers);
    
    // Create a webhook entry
    let webhook_entry = json!({
        "timestamp": timestamp.to_rfc3339(),
        "client_ip": client_ip,
        "method": method.as_str(),
        "path": path,
        "headers": headers_json,
        "payload": payload,
        "original_port": original_port
    });
    
    // Store the webhook
    if let Err(e) = state.storage.store_webhook(&webhook_entry) {
        warn!("Failed to store webhook: {}", e);
    }
    
    // Broadcast to WebSocket clients
    let webhook_json = webhook_entry.to_string();
    info!("Broadcasting webhook: {}", webhook_json);
    state.ws_handler.broadcast(webhook_json).await;
    
    // Log the webhook
    info!(
        "Webhook received: {} {} from {} (originally to port {})",
        method, path, client_ip, original_port
    );
    
    // Return a generic success response
    StatusCode::OK
}

// Parse a payload, handling malformed JSON gracefully
fn parse_payload(payload: &[u8]) -> Value {
    match serde_json::from_slice(payload) {
        Ok(json) => json,
        Err(_) => {
            // For non-JSON payloads, wrap them in an anomaly structure
            json!({
                "anomaly_payload": String::from_utf8_lossy(payload)
            })
        }
    }
}

// Convert headers to a JSON object
fn headers_to_json(headers: &HeaderMap) -> Value {
    let mut headers_map = serde_json::Map::new();
    
    for (name, value) in headers.iter() {
        if let Ok(value_str) = value.to_str() {
            headers_map.insert(name.as_str().to_string(), json!(value_str));
        } else {
            // Handle binary headers
            let value_bytes = value.as_bytes();
            headers_map.insert(
                name.as_str().to_string(),
                json!(format!("<binary: {} bytes>", value_bytes.len())),
            );
        }
    }
    
    Value::Object(headers_map)
}
