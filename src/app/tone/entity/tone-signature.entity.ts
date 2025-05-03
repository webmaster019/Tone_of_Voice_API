import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tone_signature')
export class ToneSignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  brandId: string;

  @Column()
  tone: string;

  @Column()
  languageStyle: string;

  @Column()
  formality: string;

  @Column()
  formsOfAddress: string;

  @Column()
  emotionalAppeal: string;

  @Column({ nullable: true })
  classification: string;

  @Column('float', { nullable: true })
  readabilityScore: number;

  @Column('int', { nullable: true })
  wordCount: number;

  @Column('int', { nullable: true })
  sentenceCount: number;

  @Column({ nullable: true })
  sentiment: string;

  @Column('int', { nullable: true })
  emojiCount: number;

  @Column('int', { nullable: true })
  questionCount: number;

  @Column('int', { nullable: true })
  exclamationCount: number;

  @Column('float', { nullable: true })
  avgWordLength: number;

  @Column({ default: false })
  hasHashtags: boolean;

  @Column({ default: false })
  hasMentions: boolean;

  @Column('float', { nullable: true })
  punctuationDensity: number;

  @Column('int', { nullable: true })
  emphaticCapitalWords: number;

  @Column({ default: false })
  usesFirstPerson: boolean;

  @Column({ default: false })
  usesSecondPerson: boolean;

  @Column({ default: false })
  usesPassiveVoice: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
