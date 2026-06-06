package com.MTA.V01.repositories.enumRepos;

import com.MTA.V01.models.enumerations.ERole;
import com.MTA.V01.models.enumerationClasses.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role,Long> {
    Optional<Role> findByName(ERole name);

    boolean existsByName(ERole name);
}
