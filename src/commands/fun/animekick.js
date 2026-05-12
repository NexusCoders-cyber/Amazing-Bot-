import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animekick',
  endpoint: 'kick',
  verb: 'kicked',
  selfAction: false
});
