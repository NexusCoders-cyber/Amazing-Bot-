import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animesmug',
  endpoint: 'smug',
  verb: 'smugged',
  selfAction: true
});
