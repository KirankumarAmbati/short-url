const mariadb = require('mariadb');
const pool = mariadb.createPool({host: 'localhost', user: '', connectionLimit: 5});

let conn;
async function asyncFunction() {
  try {

	conn = await pool.getConnection();
    await conn.query("use test;");
  } catch (err) {
	throw err;
  } finally {
	if (conn) conn.release(); //release to pool
  }
}

asyncFunction();

const express = require('express');
const bodyParser = require('body-parser');
const path= require('path');
const app = express();
 
app.use(bodyParser.json());

app.get('/', function (req, res) {
  return res.sendFile(path.join(__dirname, './index.html'));
});

app.post('/', async function (req, res) {
  const url = req.body.url;
  const shortUrl = req.body.shortUrl || require("randomstring").generate(8);
  
  const query = `INSERT INTO cuteify (url, shortUrl) VALUES (?)`;

  const values = [
    url,
    shortUrl
  ];

  const shortURLExists = await conn.query(`SELECT * from cuteify where shortUrl = ?`, [shortUrl]);

  if(shortURLExists.length > 0 && url !== shortURLExists[0].url) {
    return res.send({
      status: -1,
      message: "ShortURL is already allocated. Try a different short URL! ",
      shortUrl: shortURLExists[0].shortUrl
    });
  } else if(shortURLExists.length > 0 && url === shortURLExists[0].url) {
    return res.send({
      status: -1,
      message: "This short URL is already allocated to this URL. ",
      shortUrl: shortURLExists[0].shortUrl
    });
  }

  let resp = await conn.query(`SELECT * from cuteify where url = ?`, [url]);

  if(resp.length > 0) {
    if(req.body.shortUrl && req.body.shortUrl !== resp[0].shortUrl) {
      await conn.query(`UPDATE cuteify SET shortUrl = ? where url = ?`, [req.body.shortUrl, url]);

      return res.json({
        status: 201,
        message: "ShortURL has been updated !",
        shortUrl: req.body.shortUrl
      });
    } else {
      return res.json({
        status: 200,
        message: "ShortURL already exists!",
        shortUrl: resp[0].shortUrl
      });
    }
  } else {
    try {
      await conn.query(query, [values]);
    } catch (error) {
      return res.json({
        status: 500,
        message: "Failed !"
      });

    }
  
    return res.json({
      status: 201,
      message: "Success !",
      shortUrl
    });

  }
});

app.get('/:shortUrl', async function (req, res) {

  const shortUrl = req.params.shortUrl;

  const resp = await conn.query(`SELECT * from cuteify where shortUrl = ?`, [shortUrl]);

  if(resp.length == 0) {
    return res.send('Short URL doesnt exist!');
  }
  
  return res.redirect(resp[0].url);
});

app.listen(8000, () => console.log('App started running on 8000.'))
