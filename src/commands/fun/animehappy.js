import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animehappy',
  endpoint: 'happy',
  verb: 'felt happy',
  selfAction: true
});
