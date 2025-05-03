import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tone_evaluation')
export class ToneEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  brandId: string;

  @Column('text')
  originalText: string;

  @Column('text')
  rewrittenText: string;

  @Column()
  fluency: string;

  @Column()
  authenticity: string;

  @Column()
  toneAlignment: string;

  @Column()
  readability: string;

  @Column('simple-array')
  strengths: string[];

  @Column('simple-array')
  suggestions: string[];

  @Column('float', { nullable: true })
  score: number;

  @Column('int', { nullable: true })
  latencyMs: number;

  @Column('jsonb', { nullable: true })
  accuracyPoints: {
    fluency: number;
    authenticity: number;
    toneAlignment: number;
    readability: number;
  };

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
