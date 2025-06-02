# 🚀 ZWebHook-Tester

A robust, containerized webhook testing and debugging solution with real-time display, advanced filtering, and analytics capabilities. Built with Rust backend and modular JavaScript frontend.

## 📋 Features

- **Transparent Interception**: Captures incoming webhook requests on arbitrary ports and paths.
- **Defensive Payload Handling**: Gracefully handles and logs all payloads, including malformed or non-JSON payloads.
- **Efficient Storage**: Stores webhook metadata using Apache Arrow for compact storage.
- **Real-time Updates**: Provides WebSocket-based real-time display of incoming webhooks.
- **Advanced Filtering**: Filter webhooks using JSONPath expressions, methods, paths, and more.
- **Analytics Dashboard**: Visualize webhook traffic with interactive charts and statistics.
- **Webhook Replayer**: Test and debug by replaying captured webhooks with custom modifications.
- **Modular Frontend**: Clean, maintainable JavaScript architecture with separate concerns.
- **Modern UI**: Elegant Tailwind CSS-based frontend with dark mode support.
- **Fully Containerized**: Runs in a Docker container with firewall redirection rules.

## 🏗️ Architecture

- **Backend**: Built with Axum, Tokio, and Apache Arrow for high-performance async processing.
- **Frontend**: Modular JavaScript architecture with WebSocket real-time updates:
  - Separate modules for WebSockets, UI, Search, Analytics, and Application logic
  - Dynamic content updates without page refreshes
  - Interactive data visualization with Chart.js
- **Storage**: Apache Arrow for compact and efficient webhook storage with fast querying.
- **Transparent Proxy**: Uses iptables inside a privileged container to redirect ports.

## 🛠️ Getting Started

### Prerequisites

- Docker and Docker Compose

### Running with Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/copyleftdev/zwebhook-tester-rs.git
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
curl -X POST http://localhost:9000/webhook -H "Content-Type: application/json" \
  -d '{"event":"test","data":"example"}'

# Test a webhook on port 8888 with an arbitrary path
curl -X POST http://localhost:8888/api/v1/notifications -H "Content-Type: application/json" \
  -H "X-Api-Key: secret-key" \
  -d '{"event":"notification","priority":"high","user":{"id":123,"name":"John Doe"}}'

# Test with a complex nested payload
curl -X PUT http://localhost:8080/webhook/orders/update -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"order":{"id":"ORD-12345","status":"shipped","items":[{"product":"T-shirt","quantity":2,"price":19.99},{"product":"Jeans","quantity":1,"price":59.99}],"customer":{"id":"CUST-789","email":"jane@example.com"},"total":99.97}}'

# Test with a different HTTP method
curl -X DELETE http://localhost:8080/webhook/resource/123 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: abc-123-xyz" \
  -d '{"reason":"expired_subscription","metadata":{"userId":"U9876","timestamp":"2023-05-15T10:30:00Z"}}'
```

### Using the Frontend

Access the advanced modular frontend at [http://localhost:8080/frontend/logs-modular.html](http://localhost:8080/frontend/logs-modular.html)

- **Real-time Monitoring**: Watch webhooks appear instantly as they arrive
- **Advanced Filtering**: Use the JSONPath expression field to filter webhook contents (e.g., `$.order.customer.id`)
- **Analytics**: View method distribution and webhook timeline in the Analytics tab
- **Replayer**: Modify and resend captured webhooks from the Replayer tab

## 🧩 Project Structure

```
zwebhook-tester-rs/
├── Cargo.toml              # Rust dependencies
├── Dockerfile              # Multi-stage build for the application
├── docker-compose.yml      # Container configuration
├── entrypoint.sh           # Sets up iptables rules and starts the app
├── frontend/
│   ├── index.html          # Home page
│   ├── logs.html           # Legacy WebSocket-driven UI
│   ├── logs-modular.html   # Modern modular implementation
│   └── js/                 # Modular JavaScript architecture
│       ├── app.js          # Application initialization
│       ├── websocket.js    # WebSocket connection and message handling
│       ├── ui.js           # UI interactions and theme management
│       ├── search.js       # Search and filtering functionality
│       └── analytics.js    # Data visualization and statistics
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
