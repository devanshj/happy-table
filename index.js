
// Modules
var express = require("express");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var expressSession = require("express-session");
var MongoClient = require("mongodb").MongoClient;
var mongodbUrl = "redacted";
var app = express();

// Static Files and Folders
app.use("/js",express.static(__dirname + "/js"));
app.use("/css",express.static(__dirname + "/css"));
app.use("/partials",express.static(__dirname + "/partials"));

// Setting up modules
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(expressSession({secret:"ddj",resave:true,saveUninitialized:true}));

// Some Fns
function randomString(length){return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);}

// getting data
app.post("/get/:data",function(req,res){
	if(req.body.authToken == req.session.authToken){
		MongoClient.connect(mongodbUrl, function(err, db) {
			console.log("Connected correctly to server.");
			db.collection("productTypes_596b94bbf36d281eb4408b57").find().toArray(function(err,types){
				for (var i = 0; i < types.length; i++) {
					types[i].isDeletable = true;
				};
				res.json(types);
			});
			db.close();
		});
	}
})

app.post("/update/:data",function(req,res){
	console.log(req.params.data);
	console.log(req.body);
	if(req.body.authToken == req.session.authToken){
		res.json({success:true});
		/*MongoClient.connect(mongodbUrl, function(err, db) {
			console.log("Connected correctly to server.");
			db.collection("productTypes_596b94bbf36d281eb4408b57").find().toArray(function(err,types){
				for (var i = 0; i < types.length; i++) {
					types[i].isDeletable = true;
				};
				res.json(types);
			});
			db.close();
		});*/
	}
})

app.get("/",function(req,res){
	req.session.authToken = randomString(6);
	res.cookie("authToken",req.session.authToken);
	res.sendFile(__dirname + "/index.html")
})


// start app
app.listen(3000,function(){
	console.log("App listening on port 3000");
});














