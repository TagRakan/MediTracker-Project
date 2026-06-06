package com.MTA.V01.repositories;

import com.MTA.V01.models.Dose;
import com.MTA.V01.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DoseRepository extends JpaRepository<Dose, Long> {
    List<Dose> findByNameContainsIgnoreCaseAndUser_Id(String name, Long id);

    boolean existsByDoseSimpleIdentifier(String doseSimpleIdentifier);

    List<Dose> findByDoseSimpleIdentifier(String doseSimpleIdentifier);

    List<Dose> findByIsActiveTrueAndUser(User user);

}
