package com.MTA.V01.repositories;

import com.MTA.V01.models.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine,Long> {
    Boolean existsByName(String name);

    List<Medicine> findByNameContainsIgnoreCase(String name);

    List<Medicine> findByNameContainsIgnoreCaseAndIsCustomFalse(String name);
}
