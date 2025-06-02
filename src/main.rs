use std::net::SocketAddr;
use std::os::unix::io::AsRawFd;
use std::sync::Arc;
use axum::extract::{ConnectInfo, State};
use axum::routing::{get, post, put, patch, delete, get_service};
use axum::{Router, Server};
use anyhow::Result;
use libc::{sockaddr_in, SOL_IP, SO_ORIGINAL_DST};
use socket2::Socket;
use tokio::net::TcpListener;
use tower_http::{
    cors::CorsLayer,
    services::ServeDir,
    trace::TraceLayer,
};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

mod routes;
mod storage;
mod websocket;

// Global WebSocket handler
use crate::websocket::WebSocketHandler;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;
    
    info!("ZWebHook-Tester starting up...");
    
    // Initialize storage
    let storage = Arc::new(storage::ArrowStorage::new()?);
    
    // Initialize WebSocket handler
    let ws_handler = Arc::new(WebSocketHandler::new(storage.clone()));
    
    // Create a socket with Tokio
    let addr = "0.0.0.0:8080".parse::<SocketAddr>().unwrap();
    let listener = TcpListener::bind(addr).await?;
    
    info!("Listening on port 8080 (and all redirected ports)");
    
    // Set up the routes
    let app = Router::new()
        .route("/ws", get(websocket::ws_handler))
        // Explicitly define static file routes first
        .route("/", get(|| async { axum::response::Redirect::to("/index.html") }))
        // Serve all static files from the frontend directory
        .nest_service("/frontend", get_service(ServeDir::new("frontend")))
        // Maintain compatibility with direct root access for main pages
        .route("/index.html", get_service(ServeDir::new("frontend").append_index_html_on_directories(false)))
        .route("/logs.html", get_service(ServeDir::new("frontend").append_index_html_on_directories(false)))
        .route("/logs-modular.html", get_service(ServeDir::new("frontend").append_index_html_on_directories(false)))
        // Add webhook catch-all routes last
        .fallback(routes::handle_webhook)
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(routes::AppState {
            storage: storage.clone(),
            ws_handler: ws_handler.clone(),
        });
    
    // Start the server
    let std_listener = listener.into_std()?;
    axum::Server::from_tcp(std_listener)?
        .serve(app.into_make_service_with_connect_info::<SocketAddr>())
        .await?;
    
    Ok(())
}

// Helper function to extract original destination port from a socket
pub fn get_original_dst(socket: &Socket) -> Result<u16> {
    let mut addr: sockaddr_in = unsafe { std::mem::zeroed() };
    let mut addr_len = std::mem::size_of::<sockaddr_in>() as u32;
    
    let ret = unsafe {
        libc::getsockopt(
            socket.as_raw_fd(),
            SOL_IP,
            SO_ORIGINAL_DST,
            &mut addr as *mut _ as *mut libc::c_void,
            &mut addr_len as *mut _ as *mut libc::socklen_t,
        )
    };
    
    if ret != 0 {
        anyhow::bail!("Failed to get original destination: {}", std::io::Error::last_os_error());
    }
    
    Ok(u16::from_be(addr.sin_port))
}
