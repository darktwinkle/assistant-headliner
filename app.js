const { Console } = require('console');
const config = require('./config.json');
const fetch = require('node-fetch');
const { google } = require('googleapis');
const Photos = require('googlephotos');
const fs = require('fs');
const imageGenerator = require('./gen.js');
const sources = require('./sources.json');
const rimraf = require('rimraf');

module.exports = {
    listSharedAlbums: function(accessToken) {
        return getSharedAlbums(accessToken).then(res => res.sharedAlbums.map(album => JSON.parse('{"title":"' + album.title + '", "url":"' + album.shareInfo.shareableUrl + '"}')))
    },
    refreshToken: function() {
        return fetch('https://www.googleapis.com/oauth2/v4/token', {
            method: 'post',
            body:    JSON.stringify({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                refresh_token: config.refreshToken,
                grant_type: 'refresh_token'
            }),
            headers: { 'Content-Type': 'application/json' },
        })
        .then(res => res.json())
        .then(res => res['access_token']);
    },
    emptyAlbums: function(accessToken) {
        getSharedAlbums(accessToken).then(res => {
            if (res.sharedAlbums) {
                res.sharedAlbums.forEach(album => {
                    getAlbumContent(album.id, accessToken).then(res => {
                        if (res.mediaItems) {
                            removeAlbumContent(album.id, {'mediaItemIds' : res.mediaItems.map(item => item.id)}, accessToken).then(() => {
                                console.log('Emptying album: ' + album.title)
                                removeDir(sources.news.find(o => o.name == album.title).imageFolder)
                            })
                        }
                    })
                })
            }
        })

    },
    fillAlbums: function(accessToken) {
        imageGenerator.generateImages()
        setTimeout(() => {
            console.log('Staring album operations')
            let photos = new Photos(accessToken);
            getSharedAlbums(accessToken).then(res => {
                if (res.sharedAlbums) {
                    res.sharedAlbums.forEach((album, i) => {
                        (async () => {
                            let source = sources.news.find(o => o.name == album.title).imageFolder;
                            await uploadFiles(photos, album.id, source).then(() => {
                                console.log('Uploading from ' + source + ' to: ' + album.title)
                            })
                        })()
                    })
                }
            })
        }, 100000)
    },
    generateAlbums: function(accessToken) {
        let photos = new Photos(accessToken)
        sources.news.forEach(source => {
            createAlbum(photos, source.name).then(res => {
                makeAlbumSharable(res.id, accessToken).then(res => console.log(res))
            })
        })
    }
}

const createAlbum = async function(photos, name) {
    return await photos.albums.create(name)
}

const uploadFiles = async function(photos, albumId, folderPath) {
    return await photos.mediaItems.uploadMultiple(albumId, getFileNames(folderPath), folderPath, requestDelay = 500)
}

const makeAlbumSharable = function(albumId, accessToken) {
    return apiFetch('https://photoslibrary.googleapis.com/v1/albums/' + albumId + ':share', {
        'sharedAlbumOptions': {
            'isCollaborative': 'true',
            'isCommentable': 'true'
        }
    }, accessToken)
}

const getAlbumContent = function(albumId, accessToken) {
    return apiFetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
        "pageSize": "100",
        "albumId": albumId
      }, accessToken)
}

const getSharedAlbums = function(accessToken) {
    return fetch('https://photoslibrary.googleapis.com/v1/sharedAlbums', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
          },
        body: null,
    })
    .then(res => res.json())
}

const removeAlbumContent = function(albumId, body, accessToken) {
    return apiFetch('https://photoslibrary.googleapis.com/v1/albums/' + albumId + ':batchRemoveMediaItems', body, accessToken)
}

function getFileNames(folderPath) {
    return fs.readdirSync(folderPath).map(file => JSON.parse('{"name": "' + file + '"}'))
}

function removeDir(dir) {
    setTimeout(() => rimraf(dir, () => console.log('Removing directory: ' + dir)), 60000);
}

function apiFetch(url, body, accessToken) {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
          },
        body: JSON.stringify(body),
    }).then(res => res.json())

}