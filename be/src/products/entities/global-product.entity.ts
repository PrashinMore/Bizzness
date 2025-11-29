import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'global_products' })
// Note: Trigram indexes are created via SQL migration (001_setup_pg_trgm.sql)
// TypeORM doesn't support GIN trigram indexes directly, so we create them manually
export class GlobalProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  category?: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  aliases!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

