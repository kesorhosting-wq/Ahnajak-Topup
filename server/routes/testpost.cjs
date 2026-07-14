const express = require("express"); const r = express.Router(); r.post("/test", (req,res)=>res.json({ok:true})); module.exports = r;
