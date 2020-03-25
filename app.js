process.env.NODE_ENV !== 'production' ? require('dotenv').config() : null ;
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = express();
const User = require("./model/User");
const cors = require("cors");
const multer  = require('multer');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const uri = process.env.MONGODB_URI;
mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });

app.use(cors());
app.use(express.json());

// S3 upload images
aws.config.update({
  secretAccessKey: process.env.AWS_SECRET,
  accessKeyId: process.env.AWS_KEY,
  region: 'us-east-2'
});
const s3 = new aws.S3();
const upload = multer({
  storage: multerS3({
    s3,
    bucket: 'project-veronica-profile-images',
    key: function (req, file, cb) {
      cb(null, file.originalname);
    }
  })
});

// Sign up
app.post("/register", async (req, res, next) => {
  try {
    const find = await User.findOne({ email: req.body.email });
    if(!find){
      const user = await User.create({ name: req.body.name, gender: req.body.gender, age: req.body.age,  email: req.body.email, password: req.body.password });
      const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY);
      res.json({ token });
    } else {
      res.json({ error: "El usuario ya esta registrado!" });
    }    
  } catch (err) {
    if(err.name === "ValidationError"){
      res.json({ error: err.errors });
    } else {
      next(err);
    }    
  }
});

// Login
app.post("/login", async (req, res, next) => {
  try {
    const user = await User.authenticate(req.body.email, req.body.password);
    if (user) {
      const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY);
      res.json({ token, user });
    } else {
      res.status(401).json({ error: "Email o password invalido" });
    }
  } catch (err) {
    next(err);
  }
});

// Errors handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const port = process.env.PORT;
app.listen(port, () => console.log(`Escuchando en el puerto ${port} ....`));