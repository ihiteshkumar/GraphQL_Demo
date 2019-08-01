'use strict';
const request = require('request-promise');
const _ = require('lodash');

const artists = async ({name}) => {
        const options = {
            uri: 'https://itunes.apple.com/search',
            qs: {
                term: name,
                country: 'us',
                entity: 'allArtist',
            },
            json: true,
        };

        const {results} = await request(options);
        return results.map((artist) => {
            return {
                name: artist.artistName,
                url: artist.artistLinkUrl,
                id: artist.artistId,
                genre: artist.primaryGenreName,
            };
        });
    };

const songs = async ({name}) => {
    const options = {
        uri: 'https://itunes.apple.com/search',
        qs: {
            term: name,
            country: 'us',
            entity: 'song',
        },
        json: true,
    };

    const {results} = await request(options);
    return results.map((song) => {
        return {
            name: song.trackName,
            artistName: song.artistName,
            album: song.collectionName,
            url: song.trackViewUrl,
            id: song.trackId,
        };
    });
};

const books = [
    {name: 'Name of the Wind', genre: 'Fantasy', id: '1', authorId: '1'},
    {name: 'The Final Empire', genre: 'Fantasy', id: '2', authorId: '2'},
    {name: 'The Hero of Ages', genre: 'Fantasy', id: '4', authorId: '2'},
    {name: 'The Long Earth', genre: 'Sci-Fi', id: '3', authorId: '3'},
    {name: 'The Colour of Magic', genre: 'Fantasy', id: '5', authorId: '3'},
    {name: 'The Light Fantastic', genre: 'Fantasy', id: '6', authorId: '3'},
];
const authors = [
    {name: 'Patrick Rothfuss', age: 44, id: '1'},
    {name: 'Brandon Sanderson', age: 42, id: '2'},
    {name: 'Terry Pratchett', age: 66, id: '3'}
];
const resolvers = {
    Query: {
        artists: (root, args) => {
            return artists(args);
        },
        songs: (root, args) => {
            return songs(args);
        },
        books: () => {
            return books;
        },
        book: (root, args) => {
            // return _.find(books, {id: args.id});
            var myBook =  _.find(books, {id: args.id});
            author(myBook.authorId);
        },
        author: (root, args) => {
            return _.find(authors, {id: args.id});
        },
        authors: () => {
            return authors;
        }
    },
    Book: {
        author: (root) => {
            return _.find(authors, {id: root.authorId});
        }
    }
};

module.exports = resolvers;
