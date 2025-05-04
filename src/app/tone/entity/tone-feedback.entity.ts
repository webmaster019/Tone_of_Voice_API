import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tone_feedback')
export class ToneFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  evaluationId: string;

  @Column()
  userId: string;

  @Column({ type: 'boolean' })
  helpful: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;
}
