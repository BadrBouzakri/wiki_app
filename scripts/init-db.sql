-- Wiki App Database Initialization Script
-- This script creates the initial database structure and sample data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create documentation table
CREATE TABLE IF NOT EXISTS documentation (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    source VARCHAR(100) NOT NULL,
    source_url VARCHAR(1000),
    keywords TEXT[],
    category VARCHAR(100),
    priority INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create context_activities table
CREATE TABLE IF NOT EXISTS context_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    activity_data JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE
);

-- Create suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    documentation_id INTEGER REFERENCES documentation(id) ON DELETE CASCADE,
    context_data JSONB NOT NULL,
    relevance_score DECIMAL(3,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    feedback VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documentation_keywords ON documentation USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_documentation_tags ON documentation USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documentation_title_search ON documentation USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_documentation_content_search ON documentation USING GIN(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_context_activities_timestamp ON context_activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_context_activities_type ON context_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_suggestions_relevance ON suggestions(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_user_created ON suggestions(user_id, created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documentation_updated_at BEFORE UPDATE ON documentation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert demo user
INSERT INTO users (username, email, password_hash, role) 
VALUES 
    ('demo', 'demo@wikiapp.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeNanxhd0z1.9eqUO', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample documentation
INSERT INTO documentation (title, content, tags, source, keywords, category, priority) VALUES
(
    'Kubernetes Troubleshooting Guide',
    'This comprehensive guide covers common Kubernetes debugging techniques and solutions.

## Common Issues

### Pod CrashLoopBackOff
When a pod continuously crashes and restarts:

1. Check pod logs: `kubectl logs <pod-name> -f`
2. Describe the pod: `kubectl describe pod <pod-name>`
3. Check resource limits and requests
4. Verify image availability

### Service Not Accessible
If services are not reachable:

1. Check service endpoints: `kubectl get endpoints`
2. Verify service selector matches pod labels
3. Test network connectivity with `kubectl exec`

### Storage Issues
For persistent volume problems:

1. Check PV and PVC status
2. Verify storage class configuration
3. Check node disk space',
    ARRAY['kubernetes', 'troubleshooting', 'debugging', 'devops'],
    'built-in',
    ARRAY['kubernetes', 'kubectl', 'pod', 'service', 'troubleshoot', 'debug'],
    'troubleshooting',
    9
),
(
    'Docker Best Practices',
    'Essential Docker best practices for production environments.

## Image Optimization

### Multi-stage Builds
Use multi-stage builds to reduce image size:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Security
- Run as non-root user
- Use specific image tags
- Scan images for vulnerabilities
- Minimize attack surface

### Performance
- Use .dockerignore files
- Layer caching optimization
- Minimize the number of layers',
    ARRAY['docker', 'containers', 'best-practices', 'security'],
    'built-in',
    ARRAY['docker', 'dockerfile', 'container', 'security', 'optimization'],
    'containers',
    8
),
(
    'SSH Connection Troubleshooting',
    'Common SSH connection issues and their solutions.

## Connection Refused

When you get "Connection refused" errors:

1. **Check if SSH service is running:**
   ```bash
   sudo systemctl status ssh
   sudo systemctl start ssh
   ```

2. **Verify the correct port:**
   ```bash
   sudo netstat -tlnp | grep :22
   ```

3. **Check firewall rules:**
   ```bash
   sudo ufw status
   sudo ufw allow ssh
   ```

## Permission Denied

For authentication issues:

1. **Check key permissions:**
   ```bash
   chmod 600 ~/.ssh/id_rsa
   chmod 700 ~/.ssh
   ```

2. **Verify authorized_keys:**
   ```bash
   cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

## Timeout Issues

- Check network connectivity
- Verify DNS resolution
- Test with verbose mode: `ssh -v user@host`',
    ARRAY['ssh', 'networking', 'troubleshooting', 'security'],
    'built-in',
    ARRAY['ssh', 'connection', 'authentication', 'network', 'firewall'],
    'networking',
    7
),
(
    'Terraform State Management',
    'Best practices for managing Terraform state files.

## Remote State Backend

Use remote backends for team collaboration:

```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-west-2"
    
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

## State Locking

Prevent concurrent modifications:

- Use DynamoDB for AWS S3 backend
- Enable state locking in your backend configuration
- Always run `terraform plan` before `apply`

## State Commands

Useful state management commands:

```bash
# List resources in state
terraform state list

# Show specific resource
terraform state show aws_instance.example

# Move resource in state
terraform state mv aws_instance.old aws_instance.new

# Import existing resource
terraform import aws_instance.example i-1234567890abcdef0
```',
    ARRAY['terraform', 'infrastructure', 'state-management', 'iac'],
    'built-in',
    ARRAY['terraform', 'state', 'backend', 'infrastructure', 'iac'],
    'infrastructure',
    6
),
(
    'Nginx Configuration Guide',
    'Common Nginx configurations for web applications.

## Basic Virtual Host

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    
    root /var/www/example.com;
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
```

## SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Load Balancing

```nginx
upstream backend {
    server backend1.example.com;
    server backend2.example.com;
    server backend3.example.com;
}
```',
    ARRAY['nginx', 'web-server', 'configuration', 'load-balancing'],
    'built-in',
    ARRAY['nginx', 'ssl', 'proxy', 'load-balancer', 'configuration'],
    'web-servers',
    5
)
ON CONFLICT (title) DO NOTHING;

-- Create demo context activities
INSERT INTO context_activities (user_id, activity_type, activity_data) VALUES
(
    1,
    'command_execution',
    '{
        "commands": ["kubectl get pods", "kubectl describe pod nginx-deployment-7d8b49cd9b-xyzab"],
        "timestamp": 1640995200000,
        "source": "/home/demo/.bash_history"
    }'
),
(
    1,
    'file_modification',
    '{
        "file": "/home/demo/docker-compose.yml",
        "timestamp": 1640995260000,
        "extension": ".yml",
        "directory": "/home/demo"
    }'
),
(
    1,
    'process_analysis',
    '{
        "processes": [
            {"user": "demo", "pid": "1234", "cpu": "5.2", "mem": "2.1", "command": "docker daemon"},
            {"user": "demo", "pid": "5678", "cpu": "3.1", "mem": "1.8", "command": "nginx: master process"}
        ],
        "timestamp": 1640995320000
    }'
);

-- Grant appropriate permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Create a view for suggestion analytics
CREATE OR REPLACE VIEW suggestion_analytics AS
SELECT 
    COUNT(*) as total_suggestions,
    AVG(relevance_score) as avg_relevance_score,
    COUNT(CASE WHEN feedback = 'helpful' THEN 1 END) as helpful_count,
    COUNT(CASE WHEN feedback = 'not_helpful' THEN 1 END) as not_helpful_count,
    COUNT(CASE WHEN feedback = 'irrelevant' THEN 1 END) as irrelevant_count,
    DATE_TRUNC('day', created_at) as date
FROM suggestions
WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

COMMIT;