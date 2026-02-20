# Serve with Nginx
FROM nginx:1.25-alpine

# Copy pre-built frontend from CI
COPY frontend/dist /usr/share/nginx/html

# Copy configuration
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
