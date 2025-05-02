import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class ToneSignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
