(function() {
//---------------------- UTILS --------------------------------//

	function flatten(matrix) {
		return Array.prototype.concat.apply([], matrix)
	}

	function distance(from, to) {
		// Euclidian distance
		return Math.abs(from.x - to.x) + Math.abs(from.y - to.y)
	}

//---------------------- GRID --------------------------------//
	const NORTH = [0, -1]
	const EAST = [1, 0]
	const SOUTH = [0, 1]
	const WEST = [-1, 0]

	const DIRECTIONS = [NORTH, EAST, SOUTH, WEST]

	const SPIKES = 's'
	const WALL = 'w'
	const FLOOR = 'f'
	const EXIT = 'x'
	const SPAWN = 'o'
	const OUT = WALL
	const TILES_CYCLE = [SPIKES, WALL, FLOOR]
	const TILES_RANK = [SPIKES, WALL, FLOOR, EXIT]

	const MAP_WIDTH = 20
	const MAP_HEIGHT = 15
	const MAX_TURNS = 300 //MAP_WIDTH * MAP_HEIGHT * 2

//---------------------- AI --------------------------------//

	const OUTPUTS = DIRECTIONS.length
	const INPUTS_PER_OUTPUT = 3
	const INPUTS = OUTPUTS * INPUTS_PER_OUTPUT

	const POPULATION = 100

	const AI_OPTIONS = {
		population: POPULATION,
		elitism: 0.1,
		randomBehaviour: 0.1,
		mutationRate: 0.2,
		mutationRange: 0.99,
		nbChild: 4,
		network: [INPUTS, [], OUTPUTS]
	}

	const ai = new Neuroevolution(AI_OPTIONS)
	let generation = 0

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
		setType(getTile(Math.floor(MAP_WIDTH / 2), MAP_HEIGHT - 1), SPAWN)
		setType(getTile(Math.floor(MAP_WIDTH / 2), 0), EXIT)
	}

	const spawn = flatGrid.find(tile => tile.tileType === SPAWN)
	const exit = flatGrid.find(tile => tile.tileType === EXIT)

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
				tile.id = 'T' + x + '-' + y
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

	function getTile(x, y) {
		return grid[y] && grid[y][x]
	}

	function setType(tile, type) {
		tile.tileType = type
		tile.className = type
	}

	//------------------- Grid Editor ---------------------------//

	let lastTile
	let lastEdition = 0

	function onTileClick() {
		// Playing
		if (turn) {
			return
		}
		// Don't remember after some time
		if (Date.now() - lastEdition > 5000) {
			lastTile = null
		}

		const tile = this
		let type
		if (!lastTile || lastTile.tileType === tile.tileType) {
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
		lastEdition = Date.now()

		// Save changes
		const chars = flatGrid.map(function(tile) { return tile.tileType })
		localStorage.setItem(STORAGE, chars.join(''))
	}

	//---------------------- Adventurer --------------------------//

	const scores = {
		// DEATH: -1000,
		// WIN: 3000,
		WIN_TURNS_LEFT: 1000,
		MOVE_CLOSER_TO_EXIT: 20,
		MOVE_TO_NEW_TILE: 50,
		// MIN_DISTANCE_TO_EXIT: -50,
		// HIT_WALL: -150,
		// CHANGE_DIRECTION: -10,
		// REVISIT: -1,
	}

	const damages = {
		SPIKES: 100,
		// WALL: 20,
		REVISIT: 5
	}

	class Adventurer {
		constructor(id, bg) {
			this.dom = document.createElement('span')
			this.id = this.dom.id = id
			this.dom.style.background = bg
		}

		setBrain(brain) {
			this.brain = brain
			this.score = 0
			this.health = 100
			this.visited = {}
			this.minDistanceToExit = Infinity
			this.moveTo(spawn)
			this.alive = true
			this.active = true
			this.best = false
			this.update()
		}

		setBest(data) {
			this.best = true
			this.brain.setSave(data)
			this.update()
		}

		tile() {
			return this.dom.parentNode
		}

		hasVisited(tile) {
			return !!this.visited[tile.id]
		}

		damage(amount) {
			if (!amount) {
				return
			}
			this.health -= amount
			if (this.active && this.health <= 0) {
				this.die()
			}
		}

		moveTo(to) {
			if (!to) {
				return
			}
			if (this.hasVisited(to)) {
				this.addScore(scores.REVISIT)
				this.damage(damages.REVISIT)
			} else {
				this.addScore(scores.MOVE_TO_NEW_TILE)
				this.visited[to.id] = true
			}
			const distToExit = distance(to, exit)
			if (distToExit < this.minDistanceToExit) {
				this.addScore(scores.MOVE_CLOSER_TO_EXIT)
				this.minDistanceToExit = distToExit
			}
			to.appendChild(this.dom)
		}

		addScore(delta) {
			if (delta) {
				this.score += delta
			}
		}

		finish() {
			this.active = false
			this.addScore(this.minDistanceToExit * scores.MIN_DISTANCE_TO_EXIT)
			ai.networkScore(this.brain, this.score)
			this.update()
		}

		die() {
			this.alive = false
			this.addScore(scores.DEATH)
			this.finish()
		}

		win() {
			this.addScore(scores.WIN)
			const turnsLeft = MAX_TURNS - turn
			this.addScore(scores.WIN_TURNS_LEFT * turnsLeft)

			this.finish()
		}

		update() {
			const traits = ['adventurer']
			if (!this.alive) {
				traits.push('dead')
			}
			if (this.best) {
				traits.push('best')
			}
			this.dom.className = traits.join(' ')
		}
	}

	const colors = palette(['mpn65', 'tol-rainbow'], POPULATION)
	const adventurers = colors.map(function(color, i) {
		return new Adventurer('A' + i, '#' + color)
	})

	//------------------- Control ---------------------------//

	function getNeighbor(tile, dir) {
		return getTile(tile.x + dir[0], tile.y + dir[1])
	}

	function around(tile) {
		return DIRECTIONS.map(function(dir) {
			return getNeighbor(tile, dir)
		})
	}

	function isWalkable(tile) {
		const type = tile ? tile.tileType : OUT
		return type === FLOOR || type === SPAWN || type === EXIT
	}

	function getDirection(adv) {
		const inputs = []
		const curr = adv.tile()
		const dist = distance(curr, exit)
		for (const tile of around(curr)) {
			const canWalkTo = isWalkable(tile)
			const closerToExit = canWalkTo && distance(tile, exit) < dist
			const visited = !canWalkTo || adv.hasVisited(tile)
			inputs.push(canWalkTo ? 0 : -1)
			inputs.push(visited ? -1 : 1)
			inputs.push(closerToExit ? 1 : -1)
		}
		if (inputs.length !== INPUTS) {
			throw new Error('Mismatched inputs')
		}
		const outputs = adv.brain.compute(inputs)
		if (outputs.length !== OUTPUTS) {
			throw new Error('Mismatched outputs')
		}

		let max
		let index
		for (let i = 0; i < DIRECTIONS.length; i++) {
			if (!i || outputs[i] > max) {
				max = outputs[i]
				index = i
			}
		}
		return DIRECTIONS[index]
	}

	function updatePosition(adv, dir) {
		if (adv.lastDir && adv.lastDir !== dir) {
			adv.addScore(scores.CHANGE_DIRECTION)
		}
		adv.lastDir = dir
		const tile = adv.tile()
		const dest = getNeighbor(adv.tile(), dir)
		const type = dest ? dest.tileType : OUT

		switch (type) {
			case SPIKES:
				adv.moveTo(dest)
				adv.damage(damages.SPIKES)
				break
			case WALL:
				adv.moveTo(tile)
				adv.addScore(scores.HIT_WALL)
				adv.damage(damages.WALL)
				break
			case FLOOR:
			case SPAWN:
				adv.moveTo(dest)
				break
			case EXIT:
				adv.moveTo(dest)
				adv.win()
				break
		}

	}

	//------------------- Game Flow ---------------------------//

	let turn = 0
	let fps
	let timeoutId
	let pauseAfter
	let best

	function startGame() {
		ai.nextGeneration().forEach(function(brain, i) {
			const adv = adventurers[i]
			adv.setBrain(brain)
			// Always ensure the all-time best is in
			if (best && best.id === adv.id) {
				adv.setBest(best)
			}
		})

		generation++
		turn = 0

		if (pauseAfter) {
			setStatus('Running generation #' + generation)
		}
		tick()
	}

	function tick() {
		turn++
		const lastTurn = turn === MAX_TURNS
		let anyActive = false
		for (const adv of adventurers) {
			if (!adv.active) {
				continue
			}
			if (lastTurn) {
				adv.finish()
				continue
			}
			anyActive = true
			const dir = getDirection(adv)
			updatePosition(adv, dir)
		}
		if (anyActive) {
			const wait = Math.round(1000 / fps)
			timeoutId = setTimeout(tick, wait)
		} else {
			endGame()
		}
	}

	function endGame() {
		clearTimeout(timeoutId)
		adventurers.sort(function(a, b) { return b.score - a.score })

		const average = adventurers.reduce(function(accum, adv) { return accum + adv.score }, 0) / adventurers.length
		const fittest = adventurers[0]

		if (!best || fittest.score > best.score) {
			best = fittest.brain.getSave()
			best.score = fittest.score
			best.generation = generation
			best.id = fittest.id
		}

		setStatus('Generation #' + generation + ' ran ' + turn + ' turns, best: ' + fittest.score + ', average: ' + Math.round(average) + ', highscore: ' + best.score)

		turn = 0
		if (!pauseAfter) {
			startGame()
		}
	}

	function setStatus(text) {
		document.getElementsByTagName('header')[0].innerHTML = text
	}

	function ensureEnd() {
		if (turn) {
			turn = MAX_TURNS - 1
			pauseAfter = true
			tick()
		}
	}

	document.getElementsByTagName('nav')[0].onclick = function (e) {
		switch (e.target.innerHTML) {
			case 'Run':
				ensureEnd()
				pauseAfter = true
				fps = 20
				startGame()
				break
			case 'Pause':
				ensureEnd()
				break
			case 'Loop':
				ensureEnd()
				pauseAfter = false
				fps = 1000
				startGame()
				break
			case 'Import/Export':
				const curr = localStorage.getItem(STORAGE) || ''
				const seed = prompt('Copy this seed or paste one here', curr)
				if (seed && seed !== curr) {
					localStorage.setItem(STORAGE, seed)
					location.reload()
				}
				break
			case 'Reset':
				localStorage.removeItem(STORAGE)
				location.reload()
				break
		}
	}
})()
