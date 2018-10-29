(function() {
//---------------------- UTILS --------------------------------//

	function flatten(matrix) {
		return Array.prototype.concat.apply([], matrix)
	}

//---------------------- GRID --------------------------------//
	const NORTH = 'N'
	const EAST = 'E'
	const SOUTH = 'S'
	const WEST = 'W'

	const DIRECTIONS = [NORTH, EAST, SOUTH, WEST]
	const ACTIONS = DIRECTIONS.concat()

	const SPIKES = 's'
	const WALL = 'w'
	const FLOOR = 'f'
	const EXIT = 'x'
	const SPAWN = 'o'
	const TILES_CYCLE = [SPIKES, WALL, FLOOR]
	const TILES_RANK = TILES_CYCLE.concat(SPAWN, EXIT)

	const MAP_WIDTH = 20
	const MAP_HEIGHT = 15

//---------------------- AI --------------------------------//

	const TRAIN_OPTIONS = {
		log: 0,
		popsize: 50,
		mutationRate: 0.5,
		mutationAmount: 3,
		provenance: 0,
		equal: true,
	}

	TRAIN_OPTIONS.elitism = Math.round(0.2 * TRAIN_OPTIONS.popsize)

	const INPUTS = DIRECTIONS.length
	const OUTPUTS = ACTIONS.length

	// Values

/*
	const ai = new neataptic.Neat(INPUTS, OUTPUTS, getFitness, TRAIN_OPTIONS);

	function record(choice, result) {
		const prev = matches[matches.length - 1]
		const match = createMatch(choice, result, prev)
		if (prev) {
			ai.train([{ input: prev.input, output: match.output }], TRAIN_OPTIONS)
		}
		matches.push(match)
	}

	ai.predict = function () {
		const prev = matches[matches.length - 1]
		if (!prev) {
			return Math.floor(Math.random() * OPTIONS.length)
		}
		const output = ai.activate(prev.input)
		let max = output[0]
		let prediction = 0
		for (let i = 1; i < OPTIONS.length; i++) {
			if (output[i] > max) {
				max = output[i]
				prediction = i
			}
		}

		return prediction
	}

	function createMatch(choice, result, prev) {
		const match = { choice: choice, result: result, input: [], output: [] }
		const input = match.input
		const output = match.output
		for (let i = 0; i < OPTIONS.length; i++) {
			input[i] = output[i] = i === choice ? 1 : 0
		}
		// Track who won
		input.push(result)
		// Track if they picked the same option again
		input.push(prev && prev.choice === choice ? 1 : 0)

		if (input.length !== INPUTS) {
			throw new Error('input size mismatch')
		}

		if (output.length !== OUTPUTS) {
			throw new Error('output size mismatch')
		}
		return match
	}
	*/

	//---------------------- UI Grid -----------------------------//

	const STORAGE = 'maze'
	const AREA = MAP_WIDTH * MAP_HEIGHT

	const main = document.getElementsByTagName('main')[0]
	const board = document.getElementById('board')
	const grid = []
	const flatGrid = []

	const stored = localStorage.getItem(STORAGE) || ''
	if (stored.length === AREA) {
		generateGrid(stored)
	} else {
		generateGrid(FLOOR.repeat(AREA))
		setTypeAt(Math.floor(MAP_WIDTH / 2), MAP_HEIGHT - 1, SPAWN)
		setTypeAt(Math.floor(MAP_WIDTH / 2), 0, EXIT)
	}

	function generateGrid(data) {
		const chars = data.split('')
		const dim = Math.max(MAP_WIDTH, MAP_HEIGHT)
		for (let y = 0; y < MAP_HEIGHT; y++) {
			const row = document.createElement('div')
			row.className = 'row'
			board.appendChild(row)

			grid[y] = []
			for (let x = 0; x < MAP_WIDTH; x++) {
				const tile = document.createElement('div')
				tile.x = x
				tile.y = y
				tile.onclick = onTileClick
				setType(tile, chars.shift())

				tile.style.width = 100 / dim + 'vh'
				tile.style.height = 100 / dim + 'vh'

				row.appendChild(tile)
				grid[y][x] = tile
				flatGrid.push(tile)
			}
		}
	}

	function setType(tile, type) {
		tile.tileType = type
		tile.className = type
	}

	function setTypeAt(x, y, type) {
		setType(grid[y][x], type)
	}

	//------------------- Grid Editor ---------------------------//

	let lastTile

	function onTileClick() {
		const tile = this
		let type
		if (!lastTile || lastTile === tile) {
			const index = TILES_CYCLE.indexOf(tile.tileType)
			if (index === -1) {
				return
			}
			type = TILES_CYCLE[(index + 1) % TILES_CYCLE.length]
		} else {
			type = lastTile.tileType
		}
		setType(tile, type)
		lastTile = tile

		// Save changes
		const chars = flatGrid.map(function(tile) { return tile.tileType })
		localStorage.setItem(STORAGE, chars.join(''))
	}

	//------------------- Game Flow ---------------------------//

	function startGame() {
		setState('running')
	}

	function endGame() {
		setState('idle')
	}

	function setState(state) {
		main.className = state
	}

	document.getElementById('reset').onclick = function () {
		localStorage.removeItem(STORAGE)
		location.reload()
	}

	setState('idle')
})()
