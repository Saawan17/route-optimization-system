FROM eclipse-temurin:17-jre

WORKDIR /app

COPY build/libs/
qwer-demo-backend-0.0.1-SNAPSHOT.jarapp.jar

EXPOSE 8080

CMD java -jar app.jar