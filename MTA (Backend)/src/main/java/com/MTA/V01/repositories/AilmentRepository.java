package com.MTA.V01.repositories;

import com.MTA.V01.models.Ailment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AilmentRepository extends JpaRepository<Ailment,Long> {
}
