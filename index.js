import express from "express";

const app = express();



// Middleware
app.use(express.json());





app.get("/", (req, res) => {
    res.json({ message: "Hello World First From Express" });
});

app.get("/users", (req, res) => {
  res.json([
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
  ]);
});

app.post("/users", (req, res) => {
  const user = req.body;
  res.json({ message: "User created", user });
});

app.listen(3000, () => {
    console.log("Server running on port http://localhost:3000");
});