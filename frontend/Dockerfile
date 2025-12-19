# Simple Dockerfile that uses pre-built frontend
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy pre-built application 
COPY build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Simple health check using nginx's built-in test
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD test -f /usr/share/nginx/html/index.html || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]