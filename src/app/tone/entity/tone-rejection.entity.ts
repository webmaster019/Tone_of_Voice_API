import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('tone_rejection')
export class ToneRejection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  brandId: string;

  @Column()
  reviewer: string;

  @Column({ type: 'text' })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;
}
