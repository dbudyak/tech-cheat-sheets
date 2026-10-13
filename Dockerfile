FROM nginx:alpine
COPY index.html platform.html /usr/share/nginx/html/
COPY content/ /usr/share/nginx/html/content/
EXPOSE 80
