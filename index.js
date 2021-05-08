const fs = require('fs')
const path = require('path')

const express = require('express')
const { ApolloServer, gql } = require('apollo-server-express')

const app = express()
const PORT = 5000

function permissionChecker(uri, type) {
	try {
		fs.accessSync(uri, type)
		return true
	} catch (err) {
		return false
	}
}

function retrievePathDirs(dir, hidden) {
	const dirItems = fs
		.readdirSync(dir)
		.filter((item) => {
			if (hidden) return true
			return !item.startsWith('.')
		})
		.filter((item) => {
			const uri = path.join(dir, item)
			return fs.existsSync(uri)
		})
		.map((item) => {
			const uri = path.join(dir, item)
			const isDirectory = fs.lstatSync(uri).isDirectory()
			const isHidden = item.startsWith('.')
			const stats = fs.statSync(uri)
			const sizeInBytes = stats.size
			const info = {
				uri,
				isDirectory,
				isHidden,
				sizeInBytes,
				permission: {
					read: permissionChecker(uri, fs.constants.R_OK),
					write: permissionChecker(uri, fs.constants.W_OK),
					execute: permissionChecker(uri, fs.constants.X_OK),
				},
			}

			if (isDirectory) {
				info['itemsCount'] = fs.readdirSync(uri).length
			}

			return info
		})

	return dirItems
}

// Schema
const typeDefs = gql`
	type FilePermission {
		read: Boolean!
		write: Boolean!
		execute: Boolean!
	}

	type Directory {
		uri: String!
		isDirectory: Boolean!
		isHidden: Boolean!
		itemsCount: Int
		sizeInBytes: Float!
		permission: FilePermission!
	}

	type Query {
		getDirListing(path: String, hidden: Boolean): [Directory]
	}
`
// Resolvers
const resolvers = {
	Query: {
		getDirListing: (parent, args, context, info) => {
			const path = args.path || '/'
			const hidden = !!args.hidden

			console.log(`Requested path: '${path}'`)
			console.log(`Requested hidden status: ${hidden}`)

			return retrievePathDirs(path, hidden)
		},
	},
}

const server = new ApolloServer({ typeDefs, resolvers })
server.applyMiddleware({ app })

app.listen(PORT, () => {
	console.log(`🚀 Server started at http://localhost:${PORT}${server.graphqlPath}`)
})
