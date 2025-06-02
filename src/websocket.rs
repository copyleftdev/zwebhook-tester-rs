use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use axum::{
    extract::{ws::WebSocketUpgrade, ws::WebSocket, ws::Message, State},
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use tokio::sync::broadcast::{self, Sender, Receiver};
// using axum's WebSocket implementation instead of tokio-tungstenite directly
use tracing::{info, warn};

use crate::storage::ArrowStorage;

// WebSocket handler for real-time updates
pub struct WebSocketHandler {
    sender: Sender<String>,
    storage: Arc<ArrowStorage>,
    clients: Mutex<HashSet<String>>,
}

impl WebSocketHandler {
    pub fn new(storage: Arc<ArrowStorage>) -> Self {
        let (sender, _) = broadcast::channel(100); // Buffer size for messages
        Self {
            sender,
            storage,
            clients: Mutex::new(HashSet::new()),
        }
    }
    
    // Broadcast a message to all connected WebSocket clients
    pub async fn broadcast(&self, message: String) {
        let receiver_count = self.sender.receiver_count();
        info!("Broadcasting to {} receivers", receiver_count);
        
        if receiver_count > 0 {
            match self.sender.send(message.clone()) {
                Ok(n) => info!("Successfully broadcast message to {} receivers", n),
                Err(e) => warn!("Failed to broadcast message: {}", e)
            }
        } else {
            info!("No receivers connected, message not broadcast");
        }
    }
    
    // Register a new client
    fn register_client(&self, client_id: String) {
        let mut clients = self.clients.lock().unwrap();
        clients.insert(client_id.clone());
        info!("Client connected: {}", client_id);
        info!("Total connected clients: {}", clients.len());
    }
    
    // Unregister a client
    fn unregister_client(&self, client_id: &str) {
        let mut clients = self.clients.lock().unwrap();
        clients.remove(client_id);
        info!("Client disconnected: {}", client_id);
        info!("Total connected clients: {}", clients.len());
    }
    
    // Subscribe to messages
    fn subscribe(&self) -> Receiver<String> {
        self.sender.subscribe()
    }
}

// WebSocket handler function for Axum
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<crate::routes::AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

// Handle a WebSocket connection
async fn handle_socket(
    socket: WebSocket,
    state: crate::routes::AppState,
) {
    // Split the socket into a sender and receiver
    let (mut sender, mut receiver) = socket.split();
    
    // Generate a unique client ID
    let client_id = format!("client_{}", hex::encode(&rand::random::<[u8; 8]>()));
    
    // Register the client
    state.ws_handler.register_client(client_id.clone());
    
    // Subscribe to broadcast messages
    let mut broadcast_receiver = state.ws_handler.subscribe();
    
    // Spawn a task to forward broadcast messages to this client
    let client_id_clone = client_id.clone();
    let ws_handler_clone = state.ws_handler.clone();
    let forward_task = tokio::spawn(async move {
        while let Ok(msg) = broadcast_receiver.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
        ws_handler_clone.unregister_client(&client_id_clone);
    });
    
    // Process incoming messages from this client
    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Close(_) => break,
            _ => {}  // Ignore other message types if needed
        }
    }
    
    // Cancel the forwarding task when the client disconnects
    forward_task.abort();
    state.ws_handler.unregister_client(&client_id);
}
