FROM openjdk:25-ea-1-jdk-oracle

WORKDIR /MTA

COPY target/V01-0.0.1-SNAPSHOT.jar mta.jar

EXPOSE 8080

CMD [ "java","-jar", "mta.jar" ]