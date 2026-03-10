import express from "express";

const app = express();

// Middleware
app.use(express.json());




app.get("/", (req, res) => {
    res.json({ message: "Hello World" });
});





export default app;
 