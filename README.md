# GraphQL_Demo
GraphQL Music demo app

For this GraphQL introduction demo App, we'll be building an API with music data to support clients that display information about artists, songs, lyrics, tabs (sheet music), and concerts 

## Setup

Clone the project & `cd` into it

```bash
$ git clone git@github.com:ihiteshkumar/GraphQL_Demo.git
$ cd graphql-music
```

Install the dev dependencies

```bash
$ npm install
```

Install [graphql-yoga](https://github.com/graphcool/graphql-yoga) (the GraphQL server)

you can add it to your package.json file:
```json
"dependencies": {
"graphql-yoga": "^1.13.1"
},
```
Or you can install it with npm:

```bash
$ npm i graphql-yoga@1.13.1
```

Copy the boilerplate from [graphql-demo](https://github.com/ihiteshkumar/GraphQL_Demo.git) into `index.js`

```js
'use strict';
const {GraphQLServer} = require('graphql-yoga');

const typeDefs = `
type Query {
hello(name: String): String!
}
`;

const resolvers = {
Query: {
hello: (_, {name}) => `Hello ${name || 'World'}`,
},
};

const server = new GraphQLServer({typeDefs, resolvers});
server.start(() => console.log('Server is running on http://localhost:4000'));
```

At this point, you should be able to run `npm start` and navigate to <http://localhost:4000> to see the demo server's playground.

## Organize

Let's organize things a little better!

Go ahead and delete the demo `typeDefs` and `resolvers` from `index.js`.

Create a folder called `resolvers` and add an `index.js` to it.

Create another folder called `schema` and add a file named `schema.graphql` to it.

Now we need to import these into our `index.js`.

Your `index.js` should look like this:

```js
'use strict';
const {GraphQLServer} = require('graphql-yoga');
const typeDefs = ['./schema/schema.graphql'];
const resolvers = require('./resolvers');

const server = new GraphQLServer({typeDefs, resolvers});
server.start(() => console.log('Server is running on http://localhost:4000'));
```

Go ahead and start your server with `npm start`. Your server will automatically restart each time we make changes.

## Creating your first Query

We know our clients need `artist` information, so add your first query to `schema.graphql`

```gql
type Query {
artists(name: String!): [Artist]!
}
```

This query will allow our clients to search for artists and get an array of results!

We need to define what an Artist is, so add the `Artist` type to your `schema.graphql`

```gql
type Artist {
id: ID
name: String
url: String
genre: String
}
```

Note: These fields are determined by the needs of the clients.

Awesome! But how do we actually return data?

## Creating your first Resolver

Add an `artists` resolver to `resolvers/index.js`

```js
'use strict';

const resolvers = {
Query: {
artists: (_, {name}) => {
return [{name}];
},
},
};

module.exports = resolvers;
```

Open the playground at <http://localhost:4000> and send a query for `artists`

```gql
{
artists(name: "Fake") {
name
}
}
```

You'll receive fake data, but at least we have something executing!

## Let's get some Context

Resolvers take in 4 parameters: `root`, `args`, `context`, and `info`.

* `root` the value of the previous execution level
* `args` any field-level arguments
* `context` an object containing any data that should be made available to all resolvers (think logging functions, session information, data sources, etc.)
* `info` an object containing information about the query such as the selection set, the AST of the query, parent info, etc.

## Creating your first Connector

Most GraphQL services follow some sort of `connector` pattern. The idea here is to have a layer on top of a database/backend driver that has GraphQL-specific error handling, logging, batching, and/or caching. We'll touch more on these topics later. For now, let's just think of it as our data source.

You guessed it! The connector will go on the `context`.

Let's create a new folder called `connectors` with an `index.js`

```js
'use strict';

const connectors = {};

module.exports = connectors;
```

In our main `index.js`, let's import that file and update our server:

```js
...
const connectors = require('./connectors');
const context = {connectors};

const server = new GraphQLServer({typeDefs, resolvers, context});
...
```

Let's add a new file, `connectors/iTunes.js`

```js
'use strict';

class iTunes {}

module.exports = iTunes;
```

and import it into `connectors/index.js`

```js
'use strict';
const iTunes = require('./iTunes');

const connectors = {
iTunes: new iTunes(),
};

module.exports = connectors;
```

In our `iTunes` connector, we know we're going to need to make an HTTP request to the iTunes API, so let's kill our server to install some dependencies and then start it back up

```json
"request": "^2.85.0",
"request-promise": "^4.2.2"
```

Now we can make HTTP calls!

At the top of `connectors/iTunes.js`, require our new dependency

```js
const request = require('request-promise');
```

And let's add our first method to the `iTunes` class

```js
async artists({name}) {
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
}
```

Now we can go back to `resolvers/index.js` and consume this connector from our `context`

```js
artists: (_, args, ctx) => {
return ctx.connectors.iTunes.artists(args);
},
```

And that's it!

You can open the [playground](http://localhost:4000) again and send a query for `artists`:

```gql
{
artists(name: "The Beatles") {
id
name
url
genre
}
}
```

It works! 😎

## Song Data

Add a `Song` type to your `schema`

```gql
type Song {
id: ID
name: String
artistName: String
album: String
url: String
}
```

and a new `Query` for `songs`

```gql
songs(name: String!): [Song]!
```

Let's add another method to the `iTunes` connector

```js
async songs({name}) {
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
}
```

and add a resolver for the `songs` query

```js
songs: (_, args, ctx) => {
return ctx.connectors.iTunes.songs(args);
},
```

Open the [playground](http://localhost:4000) again and send a query for `songs`

```gql
{
songs(name: "Abbey Road") {
id
name
artistName
album
url
}
}
```

But that's more data than our clients need!

## Limits

Let's add some limiting to our queries so the clients can specify how many results they need.

In your `schema`, add limit query parameters with some reasonable defaults

```gql
type Query {
artists(name: String!, limit: Int = 5): [Artist]!
songs(name: String!, limit: Int = 10): [Song]!
}
```

In your `iTunes` connector, add `limit` in **both** method signatures and to their `qs` options.

Now the clients can specify a limit or rely on our defaults

```gql
{
songs(name: "Abbey Road", limit: 1) {
id
name
artistName
album
url
}
}
```

## Graph Relationships

Now we can request artist info and songs, but it's separate.

Our clients would have to send queries like this for artist info and their songs:

```gql
{
artists(name: "The Beatles", limit: 1) {
id
name
url
genre
}
songs(name: "The Beatles") {
id
name
artistName
album
url
}
}
```

We could improve this by using query variables

```gql
query artistsWithSongs($name: String!) {
artists(name: $name, limit: 1) {
id
name
url
genre
}
songs(name: $name) {
id
name
artistName
album
url
}
}
```

```json
{
"name": "The Beatles"
}
```

But there's still no direct relationship between an `Artist` and their `Song`s.

Shouldn't we be able to query for `songs` under an `artist` and vice versa?

In your `schema`, add a `songs` field under the `Artist` type

```gql
type Artist {
id: ID
name: String
url: String
genre: String
songs(limit: Int = 10): [Song]
}
```

and in your `resolvers` add a new root type resolver object for `Artist` with a resolver for `songs`

```js
Artist: {
songs: ({name}, {limit}, ctx) => {
return ctx.connectors.iTunes.songs({name, limit});
},
},
```

Our root  query resolver for `artists` doesn't return the necessary data for `songs`. So in the next `execution level`, the `songs` resolver is called on the `Artist` object to fetch this data.

Notice this resolver is almost identical to the root `songs` query, but the `name` comes from the root object (`Artist`) instead of a field argument.

Now our clients can send more concise queries for artist info and their songs

```gql
{
artists(name: "The Beatles") {
id
name
url
genre
songs {
id
name
artistName
album
url
}
}
}
```

## Lyrics and Tabs

The clients need to get data for lyrics and tabs (sheet music), but neither of those are supported by the iTunes API.

Go ahead and add these fields to the `Song` type in your `schema`

```gql
lyrics: String
tabs: String
```

Add a new file `connectors/Lyrics.js`

```js
'use strict';
const request = require('request-promise');

class Lyrics {
async bySong({name, artistName}) {
const options = {
uri: `https://api.lyrics.ovh/v1/${artistName}/${name}`,
json: true,
};

const {lyrics} = await request(options);
return lyrics;
}
}

module.exports = Lyrics;
```

Let's import it in `connectors/index.js`

```js
...
const Lyrics = require('./Lyrics');

const connectors = {
...
Lyrics: new Lyrics(),
};

module.exports = connectors;
```

and in your `resolvers`, add a new root type resolver object for `Song` with a resolver for `lyrics`:

```js
Song: {
lyrics: (song, _, ctx) => {
return ctx.connectors.Lyrics.bySong(song);
},
},
```

We have lyrics! 🎤

What about tabs?

[Songterr](https://www.songsterr.com/) has tabs and an API, but they also have direct URLs for loading sheet music by artist name and song name. So in this case, we don't even need a connector or an API call.

Just add a resolver under the `Song` root for `tabs`:

```js
tabs: ({name, artistName}) => {
return `http://www.songsterr.com/a/wa/bestMatchForQueryString?s=${name}&a=${artistName}`;
},
```

Open the [playground](http://localhost:4000) again and send a query for `songs` with lyrics and tabs

```gql
{
songs(name: "Abbey Road", limit: 1) {
id
name
artistName
album
url
lyrics
tabs
}
}
```

🎼🎼🎼🎼

## Events

Let's add some `Event`-related types to our `schema`

```gql
type Event {
date: String
time: String
venue: Venue
tickets: Ticket
lineup: [String]
}

type Ticket {
status: String
url: String
}

type Venue {
name: String
latitude: String
longitude: String
city: String
region: String
country: String
}
```

and add `events` as a field under the `Artist` type:

```gql
events(limit: Int = 10): [Event]
```

We'll need a connector for event data. For this we'll be using the [BandsInTown API](https://app.swaggerhub.com/apis/Bandsintown/PublicAPI/3.0.0#/).

Add a new file `connectors/BandsInTown.js`

```js
'use strict';
const request = require('request-promise');

class BandsInTown {
async events({name, limit}) {
const options = {
uri: `https://rest.bandsintown.com/artists/${name}/events?app_id=qfasdfasdf`,
json: true,
};

const events = await request(options);
return events.slice(0, limit);
}
}

module.exports = BandsInTown;
```

and import it in `connectors/index.js`

```js
...
const BandsInTown = require('./BandsInTown');

const connectors = {
...
BandsInTown: new BandsInTown(),
};

module.exports = connectors;
```

Add the `events` resolver under the `Artist` root object

```js
events: ({name}, {limit}, ctx) => {
return ctx.connectors.BandsInTown.events({name, limit});
},
```

Open the [playground](http://localhost:4000) again and send a query for `artists` with events

```gql
{
artists(name: "Foo Fighters", limit: 1) {
name
events {
date
time
venue {
name
latitude
longitude
city
region
country
}
tickets {
status
url
}
lineup
}
}
}
```

`date` and `time` are null, why?

The response returned an object with a field named `datetime` instead. Let's resolve time and date from `datetime` on the `Event` type so our clients have the data they need.

```js
Event: {
time: (event) => new Date(event.datetime).toLocaleTimeString(),
date: (event) => new Date(event.datetime).toLocaleDateString(),
},
```

`tickets` is null too!

The response from `BandsInTown` has an `offers` array instead.

```js
Event: {
...
tickets: (event) => event.offers.find((offer) => offer.type === 'Tickets'),
},
```

No more `null` -- awesome!

## Weather

Now let's add the `weather` types to our `schema`

```gql
type Weather {
high: Int
low: Int
condition: String
}

enum WeatherUnit {
C
F
}
```

Under the `Event` type, add a `weather` field

```gql
weather(unit: WeatherUnit = F): Weather
```

Add a new connector `connectors/Weather.js`

```js
'use strict';
const request = require('request-promise');

class Weather {
async forecast(city, region, datetime, unit) {
const options = {
uri: 'https://query.yahooapis.com/v1/public/yql?q='
.concat('select * from weather.forecast where woeid in ')
.concat(`(select woeid from geo.places(1) where text="${city}, ${region}") `)
.concat(`and u='${unit.toLowerCase()}'&format=json`)
.concat('&env=store://datatables.org/alltableswithkeys'),
json: true
};

const {query} = await request(options);
return query.results.channel.item.forecast[0];
}
}

module.exports = Weather;
```

Notice this custom query language `Yahoo` created for their Weather API called `yql`.

Any ideas for a technology that would greatly simplify their API?

All we're asking for is forecast data for a `city` and `region`.

What if.. we could send them a GraphQL query instead?

```gql
{
forecast(city: $city, region: $region, unit: $unit) {
high
low
condition
}
}
```

Some day...

Initialize your `Weather` connector in `connectors/index.js` like you've done with the other connectors

```js
...
const Weather = require('./Weather');

const connectors = {
...
Weather: new Weather(),
};

module.exports = connectors;
```

Add a resolver under the `Event` root for `weather`:

```js
Event: {
...
weather: ({datetime, venue}, {unit}, ctx) => {
const {city, region} = venue;
return ctx.connectors.Weather.forecast(city, region, datetime, unit);
},
},
```

Open the [playground](http://localhost:4000) again and send a query for `artists` with events and weather

```gql
{
artists(name: "Foo Fighters", limit: 1) {
name
events(limit: 1) {
weather {
high
low
condition
}
date
time
venue {
name
latitude
longitude
city
region
country
}
tickets {
status
url
}
lineup
}
}
}
```

`condition` is `null`. The response has a `text` field, so let's fix it with a resolver for `condition`.

```js
Weather: {
condition: (root) => root.text,
},
```

No more `null` for `condition`, but is this weather data correct?

We're returning the first weather report in the 10 day forecast, but we need weather for the date of the event!

[moment.js](https://momentjs.com/) will allow us to compare dates in an easier way.

Let's kill our server to install `moment` and start it back up

```json
"moment": "^2.22.1",
```

```bash
npm install
npm start
```

Now let's modify our `Weather` connector

```js
const Moment = require('moment');

...

class Weather {
async forecast(city, region, datetime, unit) {
// Yahoo Weather API only supports a 10 day forecast
if (new Moment(datetime).diff(new Moment(), 'days') > 10) {
throw new Error('Event date is too far for weather forecast data');
}

// The date we want the forecast for
const weatherDate = new Date(datetime).toLocaleDateString();

...

return query.results.channel.item.forecast.find((forecast) => {
const forecastDate = new Date(forecast.date).toLocaleDateString();
return weatherDate === forecastDate;
});
}
}

...
```

Now our clients get `null` when they request weather for events that occur more than 10 days away, but they also get an error message so they know *why* it failed.

Let's check weather for an event in the next 10 days

```gql
{
artists(name: "Danny Malone", limit: 1) {
name
events(limit: 1) {
weather(unit: F) {
high
low
condition
}
date
time
venue {
name
latitude
longitude
city
region
country
}
tickets {
status
url
}
lineup
}
}
}
```

Confirm with [Yahoo Weather (Austin, TX)](https://www.yahoo.com/news/weather/united-states/texas/austin-2357536/)

Don't forget your umbrella! ☔️

## More Graph Relationships

Our clients want to be able to search for songs and get more artist infomation back than just `artistName`.

Remember earlier when we set up a graph relationship between artists and their songs?

We should create a similar relationship between a `Song` and its `Artist`.

In your `schema`, add a field for `artist` under the `Song` type

```gql
type Song {
...
artist: Artist
}
```

We'll need to modify our `songs` method in our `iTunes` connector to return the artist's ID

```js
return {
...
artistId: song.artistId,
};
```

Let's add another method to our `iTunes` connector to lookup an artist by ID

```js
async artist({id}) {
const options = {
uri: 'https://itunes.apple.com/lookup',
qs: {
id
},
json: true,
};

console.log(`looking up artist ${id}`);

const {results} = await request(options);
const artist = results[0];

return {
name: artist.artistName,
url: artist.artistLinkUrl,
id: artist.artistId,
genre: artist.primaryGenreName,
};
}
```

and add a `resolver` for `artist` under the `Song` root object

```js
artist: ({artistId}, _, ctx) => {
return ctx.connectors.iTunes.artist({id: artistId});
},
```

Lastly, let's deprecate the old `artistName` field in our `schema` so new clients won't use that field

```gql
type Song {
...
artistName: String @deprecated
artist: Artist
...
}
```

Open the [playground](http://localhost:4000) again and send a query for `songs` with artist details

```gql
{
songs(name: "Sun") {
id
name
artistName
album
url
artist {
id
name
url
genre
}
}
}
```

Awesome!

...But look at your `console`. Notice any duplicates?

This means we're fetching the same data multiple times from the API.

## N+1 Queries

Notice the pitfalls with the example above? Imagine how much worse it becomes when we change the limit to `100`, `1000`, etc.

What if we query for all songs on the album `Abbey Road`? The `artist` resolver for `Song` will be calling the iTunes API *17* times for the exact same artist ID.

How can we fix this?

## DataLoader (Batching & Caching)

[DataLoader](https://github.com/facebook/dataloader#using-with-graphql) will coalesce all individual `load`s which occur within a single frame of execution (a single tick of the event loop) and then call your batch function with all requested keys. The result is cached so additional calls to `load` for the same key will return the cached value.

Let's kill our server to add `dataloader` to our dependencies in `package.json` and start it back up

```json
"dataloader": "^1.4.0",
```

```bash
npm install
npm start
```
In our main `index.js`, we'll want to `require` dataloader at the top

```js
const DataLoader = require('dataloader');
```

We'll also want to change our `context` to include a `loaders` field so they can be used in all `resolvers`.

Our context is just a static object, but we'll need a new context to be generated for each request so our cache isn't [held across requests](https://github.com/facebook/dataloader#creating-a-new-dataloader-per-request). So let's make `context` a function!

```js
const context = () => {
const loaders = {};

return {connectors, loaders};
};
```

and we'll add our first loader for `artist`

```js
const loaders = {
artist: new DataLoader((IDs) => Promise.resolve(
IDs.map((id) => connectors.iTunes.artist({id}))
)),
};
```

Now let's modify our `artist` resolver under the `Song` root object to use the loader

```js
artist: ({artistId}, _, ctx) => {
return ctx.loaders.artist.load(artistId);
},
```

Open the [playground](http://localhost:4000) again and send the same query for `songs` with artist details

```gql
{
songs(name: "Sun") {
id
name
artistName
album
url
artist {
id
name
url
genre
}
}
}
```

Each artist ID should only be looked up once!

## 🚀 Conclusion

You've reached the end of the GraphQL Intro workshop.

Today you learned about:

* GraphQL servers
* GraphQL tools (playground)
* Organizing GraphQL projects
* Queries
* Schema / Types
* Resolvers / Execution levels
* Context
* Connectors (and making HTTP requests)
* Field Arguments
* Query Variables
* Graph Relationships
* Throwing Errors
* Naive Pitfalls (N+1 Queries)
* ... and how to solve that with DataLoaders

