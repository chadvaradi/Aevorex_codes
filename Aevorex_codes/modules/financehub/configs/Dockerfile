    # Használj egy kicsi, stabil Nginx image-et Alpine Linux alapon
    FROM nginx:stable-alpine

    # Távolítsd el az alapértelmezett Nginx konfigurációt
    RUN rm -f /etc/nginx/conf.d/default.conf /etc/nginx/nginx.conf

    # Másold be a saját Nginx konfigurációdat
    COPY nginx.conf /etc/nginx/nginx.conf

    # Másold be a frontend alkalmazás teljes tartalmát az Nginx webszerver
    # gyökérkönyvtárába a konténeren belül
    # FONTOS: A forrás a 'frontend/' (perjellel a végén), hogy a TARTALMÁT másolja
    COPY frontend/ /usr/share/nginx/html/

    # Biztosítsd a megfelelő jogosultságokat az Nginx számára
    # Fontos lehet, ha az Nginx user nem rootként fut (Alpine alapból nem)
    RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d &&     chmod -R 755 /usr/share/nginx/html &&     touch /var/run/nginx.pid &&     chown -R nginx:nginx /var/run/nginx.pid

    # Váltás az Nginx felhasználóra
    USER nginx

    # Tedd elérhetővé a 8080-as portot (amit a Cloud Run vár)
    EXPOSE 8080

    # Az Nginx indítása előtérben, amikor a konténer elindul
    CMD ["nginx", "-g", "daemon off;"]
