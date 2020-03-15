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
      const user = await User.create({ name: req.body.name, gender: req.body.gender, age: req.body.age,  email: req.body.email, password: req.body.password, phone: req.body.phone });
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

//Sign in vallidation
const requireUser = async (req, res, next) => {
  const token = req.get("Authorization");
  if (token) {
    try {
      const decoded = await jwt.verify(token, process.env.SECRET_KEY);
      if (decoded.userId) {
        const user = await User.findOne({ _id: decoded.userId });
        if (user) {
          res.locals.user = user;
          return next();
        }
      } else {
        res.status(401).json({ error: "Invalid authorization token" });
      }
    } catch (e) {
      console.log(e);
      res.status(401).json({ error: "Invalid authorization token" });
    }
  } else {
    res.status(401).json({ error: "Not authorized" });
  }
};

// Home
app.get("/users", requireUser, async (req, res, next) => {
  try {
    const active = res.locals.user;
    const lookFor = active.gender === 0 ? 1 : 0;
    const users = await User.find({ 'likedTo': { $ne: res.locals.user._id }, "gender": lookFor}, function(err, users) {
      if (err) return console.error(err);
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

app.post("/users", requireUser, async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: res.locals.user._id });
      if (user) {
        user.liked.addToSet(req.body.id);
        user.save();
      }
    const userToLike = await User.findOne({ _id: req.body.id });
    res.json(userToLike.liked.includes(res.locals.user._id.toString()));
      if (userToLike) {
        userToLike.likedTo.addToSet(res.locals.user._id);
        userToLike.save();
      }
  } catch (err) {
    next(err);
  }
});

// Feed
app.get("/matches", requireUser, async (req, res, next) => {
  try {
    const match = await User.find({ 'likedTo':  res.locals.user._id, 'liked': ((res.locals.user._id)).toString()}, function(err, match) {           
      if (err) return console.error(err);
    });    
    res.json(match);
  } catch (err) {
    next(err);
  }
});

app.post("/matches", requireUser, async (req, res, next) => {
  try {
    const deleteMAtch = await User.findOne({ _id: req.body.id });
    if(deleteMAtch){
      deleteMAtch.likedTo.remove(res.locals.user._id);
      deleteMAtch.save();
    }
    res.json('Match eliminado!');
    const deleteLike = await User.findOne({ _id: res.locals.user._id });
    if(deleteLike){
      deleteLike.liked.remove(req.body.id);
      deleteLike.save();
    }
  } catch (err) {
    next(err);
  }
});

// Profile
app.get("/profile", requireUser, async (req, res, next) => {
  try {
    res.json([]);
  } catch (err) {
    next(err);
  }
});

app.post("/profile", requireUser, upload.single('image'), async (req, res, next) => {
  try {
    if(req.file){
      const user = await User.findOne({ _id: res.locals.user._id });
      if (user) {
        user.image = req.file.location;
        user.save();
      }
    } else if(req.body.description){
      const user = await User.findOne({ _id: res.locals.user._id });
      if (user) {
        user.description = req.body.description;
        user.save();
      }
      res.json({ succes: "Perfil agregado"});
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