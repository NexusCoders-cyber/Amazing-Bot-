import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animepoke',
  endpoint: 'poke',
  verb: 'poked',
  selfAction: false
});
