var express = require('express');
var app = express();
const sources = require('./sources.json')
const api = require('./app.js')

const port=process.env.PORT || 3000

var mustacheExpress = require('mustache-express');

app.engine('html', mustacheExpress());

app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.get('/', (req, res) => {
    api.refreshToken().then(token => api.listSharedAlbums(token).then(albums => {
        albums.forEach(album => album['albumImage'] = sources.news.find(o => o.name == album.title).albumImage)
        res.render('albums', {'albums': albums})
    })).catch(res.send('Invalid config! Please check your config.json file.'))
})

app.get('/refresh', (req, res) => {
    api.refreshToken().then(token => api.fillAlbums(token))
    res.send('Generating content and uploading to albums')
})

app.get('/empty', (req, res) => {
    api.refreshToken().then(token => api.emptyAlbums(token))
    res.send('Emptying albums')
})

app.get('/generate', (req, res) => {
    api.refreshToken().then(token => api.generateAlbums(token))
    res.send('Generating shared albums')
})

app.listen(port, () => console.log('Assistant Headliner started on port: ' + port));