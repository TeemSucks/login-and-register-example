// Imports
const path = require("path");
const express = require('express');
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcrypt");
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const helmet = require("helmet");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const Base64 = require("js-base64");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// settings
const app = express();
const port = process.env.PORT || 8080;
const uri = process.env.MONGODB_URI; // Replace with your MongoDB connection string in .env
const databaseName = "DATA BASENAME";; // Replace with your database

// Setup rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 250, // Limit each IP to 200 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: function (req) {
    return req.headers["x-real-ip"]; // This is where you set the property that will be used to generate the limiter key
  },
  skipFailedRequests: true, // Skip failed requests (i.e. requests that hit00, but failed to hit the rate limit)
});

app.set('view engine', 'ejs'); // set the template engine
app.set('views', path.join(__dirname, 'views')); // set the views directory
app.use(limiter);
app.use(helmet({ contentSecurityPolicy: false })); // set security headers
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

var urlencodedParser = bodyParser.urlencoded({ extended: false });

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function ConectMongoDB() {
    try {
        await client.connect(); // Connect to MongoDB
        await client.db("admin").command({ ping: 1 }); // Ping MongoDB
        console.log("Connected to MongoDB");
  
        const db = client.db(databaseName);
        usersCollection = db.collection("Users");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}
ConectMongoDB().catch(console.dir); // Call the function to connect to MongoDB


function generateToken(id, username, hashedPassword) {
    // replace with your own token generator
    const token = Base64.encode(`${id}${username}${hashedPassword}`);
    return token;
}

async function requireAuth(req, res, next) {
    const token = req.cookies.token;
  
    if (!token) {
      // return res.status(401).json({ success: false, message: "Authentication required" });
      return res.redirect("/login");
    }
  
    try {
        const user = await usersCollection.findOne({ token }); // Find the user by token
  
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid token" }); // If the user is not found
        }
  
        if (user.banned) {
            res.clearCookie("token");
            return res.status(403).json({ success: false, message: "User is banned" }); // If the user is banned
        }
  
        req.user = user; // Attach the user object to the request
  
      next(); // Continue to the route handler
    } catch (error) {
        console.error("Error checking user authentication:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
  
app.post("/api/register", urlencodedParser, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if the username meets the criteria
        const usernameRegex = /^[A-Za-z0-9_]{3,20}$/; // Regex to check if the username meets the criteria

        if (!usernameRegex.test(username)) {
        // Invalid username
        return res
            .status(400)
            .json({ success: false, message: "Invalid username format" });
        }

        const userExists = await usersCollection.findOne({ username }); // Check if the user already exists

        if (userExists) {
            return res.status(409).json({ success: false, message: "Username already exists." }); // Check if the user already exists
        }

        const userCount = await usersCollection.countDocuments(); // Get the current user count

        const id = userCount + 1; // Generate a new ID

        const saltRounds = 15; // Set the salt rounds
        const hashedPassword = await bcrypt.hash(password, saltRounds); // Hash the password

        const token = generateToken(id, username, hashedPassword); // Generate a token

        const newUser = {
          id,
          username,
          password: hashedPassword, // Add the hashed password to the user object
          token, // Add the token to the user object
          banned: false,
          createdAt: new Date(), // Set the creation date
          updatedAt: new Date(),
          _id: uuidv4(), // add a UUID to the user object
        };

        await usersCollection.insertOne(newUser); // Insert the user into the database

        res.cookie("token", token, { httpOnly: true }); // Set the cookie

        res.redirect("/home"); // Redirect to the home page
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
        }
});

app.post("/api/login", urlencodedParser, async (req, res) => {
    const { username, password } = req.body; // Get the username and password from the request body

    try {
        const user = await usersCollection.findOne({ username });

        if (!user) {
            return res.status(401).json({ success: false, message: "Authentication failed" }); // If the user is not found
        }

        const passwordMatch = await bcrypt.compare(password, user.password); // Compare the password

        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: "Authentication failed" }); // If the password does not match
        }

        if (!user.token) {
            return res.status(401).json({ success: false, message: "Token not found" }); // If the user is not found
        }

        const token = user.token; // Get the token

        res.cookie("token", token, { httpOnly: true }); // Set the cookie

        // res.json({ success: true }); // Return success
        res.redirect("/home"); // Redirect to the home page
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.get('/', (req, res) => {
    res.redirect('/home'); // Redirect to the home page
});

app.get('/register', urlencodedParser, async (req, res) => {
    res.render('register'); // Render the register page in /views/register.ejs
});

app.get('/login', async (req, res) => {
    res.render('login'); // Render the login page in /views/login.ejs
});

app.get('/home', requireAuth, async (req, res) => {
    const token = req.cookies.token;
    const user = await usersCollection.findOne({ token });
    res.render('home', {user});
});


app.get("/logout", (req, res) => {
    res.clearCookie("token"); // Clear the cookie
    res.redirect("/login"); // Redirect to the login page
});

app.listen(port, () => {
    console.log(`Login/Register app listening on port ${port}!`);
});

process.on("SIGINT", async () => {
    // Close the MongoDB connection on SIGINT (when you press Ctrl+C in terminal)
    try {
        await client.close(); // Close the MongoDB connection
        console.log("MongoDB connection closed");
        process.exit(0); // Exit the process
    } catch (error) {
        console.error("Error closing MongoDB connection:", error);
        process.exit(1); // Exit the process with an error
    }
});
