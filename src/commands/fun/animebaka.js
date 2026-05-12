import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animebaka',
  endpoint: 'baka',
  verb: 'baka-ed',
  selfAction: false
});
