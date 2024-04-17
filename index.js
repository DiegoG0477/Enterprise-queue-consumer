const amqp = require("amqplib");
const dotenv = require("dotenv");

dotenv.config();

async function sendData(msg) {
    try {
        const USERS_API_URL = String(process.env.USERS_API_URL);
        const parsedData = JSON.parse(msg.content.toString());

        const { event, data } = parsedData;

        if (event === "enterprise.users.post-register") {
            const response = await fetch(`${USERS_API_URL}/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                console.log("Usuario creado correctamente");
            } else {
                console.error("Error al crear el usuario:", response);
            }

        } else if (event === "enterprise.auth.login"){
            const response = await fetch(`${USERS_API_URL}/users/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            const responseBody = await response.json();
            const token = responseBody.token;

            console.log("Token:", token);

            //enviar el token a la cola de Notifications para que se envie un mensaje al usuario
            //por medio de websocket

            if (response.ok) {
                console.log("Usuario logueado correctamente");
            } else {
                console.error("Error al loguear el usuario:", response);
            }

        } else if (event === "enterprise.stations.allow-access"){
            const response = await fetch(`${USERS_API_URL}/acces`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            console.log("data", data);

            console.log(response);

            const responseBody = await response.json();

            console.log(responseBody);

            if (response.ok) {
                console.log("Acceso permitido a la estación correctamente");
            } else {
                console.error("Error al permitir el acceso:", response);
            }
        } else if (event === "enterprise.get-stations-by-user"){
            const response = await fetch(`${USERS_API_URL}/acces/stationsByUSer/${data.user_id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const responseBody = await response.json();

            console.log(responseBody);

            if (response.ok) {
                console.log("Estaciones obtenidas correctamente");
            } else {
                console.error("Error al obtener las estaciones:", response);
            }
        }
    } catch (error) {
        console.error("Error al procesar el mensaje:", error);
    }
}

async function connectAndConsume() {
    try {
        const USERNAME = process.env.AMQP_USERNAME;
        const PASSWORD = encodeURIComponent(process.env.AMQP_PASSWORD);
        const HOSTNAME = process.env.AMQP_HOSTNAME;
        const PORT = process.env.AMQP_PORT;
        const QUEUE_NAME = process.env.AMQP_QUEUE;

        const connection = await amqp.connect(
            `amqp://${USERNAME}:${PASSWORD}@${HOSTNAME}:${PORT}`
        );
        const channel = await connection.createChannel();

        const queueName = QUEUE_NAME;

        console.log(
            `Conectado al servidor RabbitMQ. Esperando mensajes en la cola ${queueName}.`
        );

        await channel.assertQueue(queueName, {
            durable: true,
            arguments: { "x-queue-type": "quorum" },
        });

        channel.consume(queueName, async (msg) => {
            await sendData(msg);
            channel.ack(msg);
        });
    } catch (error) {
        console.error("Error al conectar o consumir la cola:", error);
    }
}

// Llama a la función para conectar y consumir
connectAndConsume();
