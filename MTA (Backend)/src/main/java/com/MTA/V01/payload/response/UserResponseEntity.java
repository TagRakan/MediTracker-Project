package com.MTA.V01.payload.response;

import com.MTA.V01.models.*;
import com.MTA.V01.models.enumerationClasses.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class UserResponseEntity {
    private Long id;
    private String username;
    private LocalDate dataOfBirth;
    private String name;
    private Set<Role> roles;
    private List<Dose> doses;
    private List<PastDoses> pastDoses;
    private List<FamilyRelationships> familyRelationships;
    private Set<User> patients;
    private Set<User> doctors;
    private List<Medicine> medication;
}
