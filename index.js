'use strict';
const {GraphQLServer} = require('graphql-yoga');
const typeDefs = ['./schema/schema.graphql'];
const resolvers = require('./resolvers');
const server = new GraphQLServer({typeDefs, resolvers});
server.start(() => console.log('Server is running on http://localhost:4000'));
