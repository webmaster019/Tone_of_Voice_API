import { Injectable } from '@nestjs/common';
const winkNLP = require('wink-nlp');
const model = require('wink-eng-lite-web-model');

const nlp = winkNLP(model);
const its = nlp.its;

@Injectable()
export class NlpService {
  analyze(text: string) {
    const doc = nlp.readDoc(text);

    const sentences = doc.sentences().out();
    const totalSentences = sentences.length || 1;

    const tokens = doc.tokens().filter(t => t.out(its.type) === 'word');
    const words = tokens.out();
    const totalWords = words.length;

    const totalSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    const readability =
      206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords);

    const sentimentScore = Number(doc.out(its.sentiment));
    const sentiment = sentimentScore > 0.2
      ? 'Positive'
      : sentimentScore < -0.2
        ? 'Negative'
        : 'Neutral';

    const firstPersonPronouns = ['i', 'we', 'me', 'us', 'my', 'our'];
    const secondPersonPronouns = ['you', 'your'];

    const usesFirstPerson = words.some(w => firstPersonPronouns.includes(w.toLowerCase()));
    const usesSecondPerson = words.some(w => secondPersonPronouns.includes(w.toLowerCase()));

    // Additional metadata
    const emojiCount = (text.match(/\p{Emoji}/gu) || []).length;
    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    const hashtags = (text.match(/#[\w]+/g) || []);
    const mentions = (text.match(/@[\w]+/g) || []);
    const capsWords = (text.match(/\b[A-Z]{2,}\b/g) || []);

    const punctuationCount = (text.match(/[.,!?;:]/g) || []).length;
    const totalChars = text.replace(/\s+/g, '').length;
    const punctuationDensity = totalChars ? punctuationCount / totalChars : 0;

    const avgWordLength = totalWords
      ? words.reduce((sum, w) => sum + w.length, 0) / totalWords
      : 0;

    return {
      wordCount: totalWords,
      sentenceCount: totalSentences,
      readabilityScore: parseFloat(readability.toFixed(2)),
      sentiment,
      usesFirstPerson,
      usesSecondPerson,
      usesPassiveVoice: false, // unsupported in wink-nlp
      emojiCount,
      exclamationCount,
      questionCount,
      avgWordLength: parseFloat(avgWordLength.toFixed(2)),
      hasHashtags: hashtags.length > 0,
      hasMentions: mentions.length > 0,
      punctuationDensity: parseFloat(punctuationDensity.toFixed(3)),
      emphaticCapitalWords: capsWords.length,
    };
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const match = word.match(/[aeiouy]{1,2}/g);
    return match ? match.length : 1;
  }
}
