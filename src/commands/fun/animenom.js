import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animenom',
  endpoint: 'nom',
  verb: 'nommed',
  selfAction: false
});
