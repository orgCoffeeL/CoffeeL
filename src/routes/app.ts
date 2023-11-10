import express from 'express'

const router = express.Router()

router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
      <style>
        body {
          height: 100vh;
          background-color: black;
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <h1>Welcome to CoffeeL</h1>
    </body>
    </html>
  `)
})

export default {
  path: '/',
  router
}
