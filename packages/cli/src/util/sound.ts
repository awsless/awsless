import Player from 'play-sound'

const player = Player({})

export const playSuccessSound = () => {
	player.play('/System/Library/Sounds/Glass.aiff')
}

export const playErrorSound = () => {
	player.play('/System/Library/Sounds/Bottle.aiff')
}
