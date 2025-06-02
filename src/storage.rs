use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use anyhow::{Context, Result};
use chrono::Utc;
use serde_json::{json, Value};
use tracing::{info, warn};

// JSON storage implementation
pub struct ArrowStorage {
    data_dir: PathBuf,
    buffer: Mutex<Vec<Value>>,
    max_buffer_size: usize,
}

impl ArrowStorage {
    pub fn new() -> Result<Self> {
        let data_dir = PathBuf::from("data");
        fs::create_dir_all(&data_dir)?;
        
        info!("JSON storage initialized in directory: {:?}", data_dir);
        
        Ok(Self {
            data_dir,
            buffer: Mutex::new(Vec::new()),
            max_buffer_size: 100, // Flush to disk every 100 records
        })
    }
    
    // Store a webhook in the buffer and flush if necessary
    pub fn store_webhook(&self, webhook: &Value) -> Result<()> {
        let mut buffer = self.buffer.lock().unwrap();
        buffer.push(webhook.clone());
        
        // Flush the buffer if it's full
        if buffer.len() >= self.max_buffer_size {
            let webhooks = std::mem::take(&mut *buffer);
            drop(buffer); // Release the lock before the operation
            self.flush_to_disk(&webhooks)?;
        }
        
        Ok(())
    }
    
    // Flush webhooks to disk in JSON format
    fn flush_to_disk(&self, webhooks: &[Value]) -> Result<()> {
        if webhooks.is_empty() {
            return Ok(());
        }
        
        // Create a filename based on the current time
        let filename = format!("webhooks_{}.json", Utc::now().timestamp());
        let path = self.data_dir.join(filename);
        
        // Create JSON array of all webhooks
        let json_array = json!(webhooks);
        
        // Write to file
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&path)
            .context("Failed to create JSON file")?;
        
        file.write_all(json_array.to_string().as_bytes())
            .context("Failed to write to JSON file")?;
        
        info!("Flushed {} webhooks to disk: {:?}", webhooks.len(), path);
        
        Ok(())
    }
}

impl Drop for ArrowStorage {
    fn drop(&mut self) {
        // Flush any remaining webhooks when the storage is dropped
        let buffer = std::mem::take(&mut *self.buffer.lock().unwrap());
        if !buffer.is_empty() {
            if let Err(e) = self.flush_to_disk(&buffer) {
                warn!("Failed to flush webhooks on drop: {}", e);
            }
        }
    }
}
