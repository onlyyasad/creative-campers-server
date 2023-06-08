const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

const cors = require('cors');

app.use(cors());
app.use(express.json());

app.get("/", (req, res) =>{
    res.send("CreativeCamper Server")
});

app.listen(port, () =>{
    console.log(`CreativeCamper Server is running on port: ${port}`)
})