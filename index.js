const express = require('express');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

const cors = require('cors');

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pf543tb.mongodb.net/?retryWrites=true&w=majority`;

// JWT middleware :

const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: "Unauthorized Access" })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: "Unauthorized Access" })
        }
        req.decoded = decoded;
        next()
    })
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const usersCollection = client.db('creativeCampersDB').collection('users');
        const classesCollection = client.db('creativeCampersDB').collection('classes');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res.send({ token });
        })


        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            next()
        }
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            next()
        }

        // Users API Here :

        app.get("/users", verifyJwt, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })

        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "User already exists" })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        app.patch("/users/role/:email", async (req, res) => {
            const email = req.params.email;
            const role = req.body.role;
            console.log(email, role)
            const query = { email: email };
            const update = { $set: { role: role } };
            const result = await usersCollection.updateOne(query, update);
            res.send(result)
        })

        app.get('/users/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' };
            res.send(result)
        })

        app.get('/users/instructor/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' };
            res.send(result)
        })

        app.get('/users/student/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ student: false })
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { student: user?.role === 'student' };
            res.send(result)
        })

        // Classes API here:

        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result)
        })

        app.post('/classes', verifyJwt, verifyInstructor, async (req, res) => {
            const newClass = req.body;
            const result = await classesCollection.insertOne(newClass);
            res.send(result);
        })

        app.get('/myClasses', verifyJwt, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'Forbidden access!' })
            }
            const query = { instructor_email: email };
            const result = await classesCollection.find(query).toArray();
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("CreativeCamper Server")
});

app.listen(port, () => {
    console.log(`CreativeCamper Server is running on port: ${port}`)
})