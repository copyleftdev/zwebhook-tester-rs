# 🚀 ZWebHook-Tester

A robust, containerized webhook testing solution with transparent proxying capabilities, built in Rust.

## 📋 Features

- **Transparent Interception**: Captures incoming webhook requests on arbitrary ports and paths.
- **Defensive Payload Handling**: Gracefully handles and logs all payloads, including malformed or non-JSON payloads.
- **Efficient Storage**: Stores webhook metadata using Apache Arrow for compact storage.
- **Real-time Updates**: Provides WebSocket-based real-time telemetry.
- **Modern UI**: Simple, elegant Tailwind CSS-based frontend.
- **Fully Containerized**: Runs in a Docker container with firewall redirection rules.

## 🏗️ Architecture

- **Backend**: Built with Axum, Tokio, and Apache Arrow.
- **Frontend**: HTML + JavaScript + Tailwind CSS with WebSocket connection.
- **Storage**: Apache Arrow for compact and efficient webhook storage.
- **Transparent Proxy**: Uses iptables inside a privileged container to redirect ports.

## 🛠️ Getting Started

### Prerequisites

- Docker and Docker Compose

### Running with Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/zwebhook-tester-rs.git
   cd zwebhook-tester-rs
   ```

2. Build and start the container:
   ```bash
   docker-compose up --build
   ```

3. Access the UI:
   Open your browser and navigate to [http://localhost:8080](http://localhost:8080)

### Testing Webhooks

Once the application is running, you can send webhook requests to any port above 1024:

```bash
# Test a webhook on port 9000
curl -X POST http://localhost:9000/webhook -H "Content-Type: application/json" -d '{"event":"test","data":"example"}'

# Test a webhook on port 8888 with an arbitrary path
curl -X POST http://localhost:8888/api/v1/notifications -H "Content-Type: application/json" -d '{"event":"notification","priority":"high"}'

# Test with a malformed payload
curl -X POST http://localhost:7777/webhook -d 'This is not JSON data'
```

## 🧩 Project Structure

```
zwebhook-tester-rs/
├── Cargo.toml              # Rust dependencies
├── Dockerfile              # Multi-stage build for the application
├── docker-compose.yml      # Container configuration
├── entrypoint.sh           # Sets up iptables rules and starts the app
├── frontend/
│   └── logs.html           # WebSocket-driven UI
└── src/
    ├── main.rs             # Server bootstrap & socket handling
    ├── routes.rs           # HTTP routes handler
    ├── websocket.rs        # WebSocket handler logic
    └── storage.rs          # Apache Arrow storage integration
```

## 🚩 Security Note

This application uses a privileged Docker container to set up iptables rules. This is secure only in trusted development or testing environments. For production use, consider host-level firewall management.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
